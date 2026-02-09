import { NextResponse, type NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/api/validation";
import { enforceRateLimit } from "@/lib/api/security";
import { getCompanyById } from "@/lib/companies/queries";
import { sectionsToHtml, toJsonSections } from "@/lib/proposals/template";
import { requireApiUser } from "@/lib/supabase/auth";
import { proposalSaveSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  const limitResponse = enforceRateLimit(request, "proposal-save", 30, 10 * 60_000);
  if (limitResponse) {
    return limitResponse;
  }

  const auth = await requireApiUser();
  if (auth instanceof Response) {
    return auth;
  }

  const parsed = await parseJsonBody(request, proposalSaveSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }

  const { supabase, user } = auth;
  const companyResult = await getCompanyById(supabase, parsed.companyId);
  if (companyResult.error || !companyResult.data) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const html = sectionsToHtml(parsed.sections);
  const sectionsJson = toJsonSections(parsed.sections);

  if (parsed.proposalId) {
    const { data, error } = await supabase
      .from("proposals")
      .update({
        title: parsed.title,
        status: parsed.status || "draft",
        sections_json: sectionsJson,
        html,
      })
      .eq("id", parsed.proposalId)
      .eq("company_id", parsed.companyId)
      .select("id,company_id,status,title,sections_json,html,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  }

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      company_id: parsed.companyId,
      owner_user_id: user.id,
      title: parsed.title,
      status: parsed.status || "draft",
      sections_json: sectionsJson,
      html,
    })
    .select("id,company_id,status,title,sections_json,html,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

