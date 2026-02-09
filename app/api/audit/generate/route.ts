import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import { parseJsonBody } from "@/lib/api/validation";
import { enforceRateLimit } from "@/lib/api/security";
import { generateAuditWithOpenAI } from "@/lib/audit/openai";
import { buildAuditPrompt, summarizeAuditText } from "@/lib/audit/prompt";
import { getCompanyById, getLatestScrape } from "@/lib/companies/queries";
import { requireApiUser } from "@/lib/supabase/auth";
import { auditGenerateSchema } from "@/lib/validation/schemas";
import type { Json } from "@/types/supabase";

const extractScrapeBullets = (value: Json | null): string[] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const keyBullets = (value as { keyBullets?: unknown }).keyBullets;
  if (!Array.isArray(keyBullets)) {
    return [];
  }

  return keyBullets.filter((item): item is string => typeof item === "string").slice(0, 8);
};

export async function POST(request: NextRequest) {
  const limitResponse = enforceRateLimit(request, "audit-generate", 10, 10 * 60_000);
  if (limitResponse) {
    return limitResponse;
  }

  const auth = await requireApiUser();
  if (auth instanceof Response) {
    return auth;
  }

  const parsed = await parseJsonBody(request, auditGenerateSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }

  const { supabase, user } = auth;
  const [companyResult, latestScrapeResult] = await Promise.all([
    getCompanyById(supabase, parsed.companyId),
    getLatestScrape(supabase, parsed.companyId),
  ]);

  if (companyResult.error || !companyResult.data) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }
  if (latestScrapeResult.error) {
    return NextResponse.json({ error: latestScrapeResult.error.message }, { status: 400 });
  }

  const company = companyResult.data;
  const scrape = latestScrapeResult.data;
  const prompt = buildAuditPrompt({
    businessName: company.business_name,
    websiteUrl: company.website_url,
    industry: company.industry,
    stage: company.stage,
    priority: company.priority,
    score: company.score,
    notes: company.notes,
    scrapeSummary: scrape?.summary || null,
    scrapeBullets: extractScrapeBullets(scrape?.extracted_json || null),
  });

  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    const { data: blockedAudit } = await supabase
      .from("audits")
      .insert({
        company_id: parsed.companyId,
        owner_user_id: user.id,
        mode: "in_app",
        status: "blocked_missing_openai",
        prompt,
        summary: "OPENAI_API_KEY not configured. Use prompt mode.",
      })
      .select("id,company_id,status,mode,prompt,summary,created_at")
      .single();

    return NextResponse.json(
      {
        error: "OPENAI_API_KEY is not configured. Use prompt mode instead.",
        action: "Call /api/audit/prompt and run the prompt in ChatGPT, then save the result.",
        data: blockedAudit || null,
      },
      { status: 400 },
    );
  }

  const { data: createdAudit, error: insertError } = await supabase
    .from("audits")
    .insert({
      company_id: parsed.companyId,
      owner_user_id: user.id,
      mode: "in_app",
      status: "generating",
      prompt,
      summary: "Generating audit...",
    })
    .select("id,company_id,status,mode,prompt,summary,created_at")
    .single();

  if (insertError || !createdAudit) {
    return NextResponse.json({ error: insertError?.message || "Failed to create audit record." }, { status: 400 });
  }

  try {
    const modelResponse = await generateAuditWithOpenAI({ prompt });
    const summary = summarizeAuditText(modelResponse);

    const { data, error } = await supabase
      .from("audits")
      .update({
        status: "completed",
        model_response: modelResponse,
        summary,
      })
      .eq("id", createdAudit.id)
      .select("id,company_id,status,mode,prompt,model_response,summary,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audit generation failed.";

    await supabase
      .from("audits")
      .update({
        status: "failed",
        summary: summarizeAuditText(`Generation failed: ${message}`),
      })
      .eq("id", createdAudit.id);

    return NextResponse.json(
      {
        error: "Audit generation failed.",
        details: message,
      },
      { status: 500 },
    );
  }
}

