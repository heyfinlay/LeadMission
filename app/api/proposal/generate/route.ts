import { NextResponse, type NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/api/validation";
import { enforceRateLimit } from "@/lib/api/security";
import { getCompanyById, getLatestAudit } from "@/lib/companies/queries";
import { buildProposalSections, sectionsToHtml, toJsonSections } from "@/lib/proposals/template";
import { requireApiUser } from "@/lib/supabase/auth";
import { proposalGenerateSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  const limitResponse = enforceRateLimit(request, "proposal-generate", 20, 10 * 60_000);
  if (limitResponse) {
    return limitResponse;
  }

  const auth = await requireApiUser();
  if (auth instanceof Response) {
    return auth;
  }

  const parsed = await parseJsonBody(request, proposalGenerateSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }

  const { supabase, user } = auth;

  const [companyResult, latestAuditResult] = await Promise.all([
    getCompanyById(supabase, parsed.companyId),
    getLatestAudit(supabase, parsed.companyId),
  ]);

  if (companyResult.error || !companyResult.data) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }
  if (latestAuditResult.error) {
    return NextResponse.json({ error: latestAuditResult.error.message }, { status: 400 });
  }

  const sections = buildProposalSections({
    businessName: companyResult.data.business_name,
    industry: companyResult.data.industry,
    auditSummary: latestAuditResult.data?.summary || null,
  });

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      company_id: parsed.companyId,
      owner_user_id: user.id,
      status: "draft",
      title: `${companyResult.data.business_name} Proposal`,
      sections_json: toJsonSections(sections),
      html: sectionsToHtml(sections),
    })
    .select("id,company_id,status,title,sections_json,html,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

