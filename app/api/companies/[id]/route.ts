import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/supabase/auth";
import { companyUpdateSchema } from "@/lib/validation/schemas";
import {
  getAudits,
  getCompanyById,
  getCompanyTasks,
  getLatestScrape,
  getPortalSettings,
  getProposals,
} from "@/lib/companies/queries";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth instanceof Response) {
    return auth;
  }

  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid company id." }, { status: 400 });
  }

  const { supabase } = auth;
  const companyId = parsedParams.data.id;

  const [companyResult, latestScrapeResult, auditsResult, proposalsResult, portalResult, tasksResult] =
    await Promise.all([
      getCompanyById(supabase, companyId),
      getLatestScrape(supabase, companyId),
      getAudits(supabase, companyId),
      getProposals(supabase, companyId),
      getPortalSettings(supabase, companyId),
      getCompanyTasks(supabase, companyId),
    ]);

  if (companyResult.error) {
    const status = companyResult.error.code === "PGRST116" ? 404 : 400;
    return NextResponse.json({ error: companyResult.error.message }, { status });
  }

  if (latestScrapeResult.error || auditsResult.error || proposalsResult.error || portalResult.error || tasksResult.error) {
    const firstError =
      latestScrapeResult.error ||
      auditsResult.error ||
      proposalsResult.error ||
      portalResult.error ||
      tasksResult.error;

    return NextResponse.json({ error: firstError?.message || "Failed to load company data." }, { status: 400 });
  }

  return NextResponse.json({
    data: {
      company: companyResult.data,
      latestScrape: latestScrapeResult.data,
      audits: auditsResult.data || [],
      proposals: proposalsResult.data || [],
      portalSettings: portalResult.data || null,
      tasks: tasksResult.data || [],
    },
  });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth instanceof Response) {
    return auth;
  }

  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid company id." }, { status: 400 });
  }

  const parsedBody = await parseJsonBody(request, companyUpdateSchema);
  if (parsedBody instanceof NextResponse) {
    return parsedBody;
  }

  const patch: Record<string, string | number | null> = {};
  if (parsedBody.businessName !== undefined) {
    patch.business_name = parsedBody.businessName;
  }
  if (parsedBody.websiteUrl !== undefined) {
    patch.website_url = parsedBody.websiteUrl || null;
  }
  if (parsedBody.industry !== undefined) {
    patch.industry = parsedBody.industry || null;
  }
  if (parsedBody.stage !== undefined) {
    patch.stage = parsedBody.stage;
  }
  if (parsedBody.priority !== undefined) {
    patch.priority = parsedBody.priority;
  }
  if (parsedBody.score !== undefined) {
    patch.score = parsedBody.score;
  }
  if (parsedBody.notes !== undefined) {
    patch.notes = parsedBody.notes || null;
  }

  const { supabase } = auth;
  const { data, error } = await supabase
    .from("companies")
    .update(patch)
    .eq("id", parsedParams.data.id)
    .select("id,business_name,website_url,industry,stage,priority,score,notes,created_at,updated_at,client_user_id,client_email")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
