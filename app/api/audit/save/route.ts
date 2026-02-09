import { NextResponse, type NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/api/validation";
import { enforceRateLimit } from "@/lib/api/security";
import { summarizeAuditText } from "@/lib/audit/prompt";
import { getCompanyById } from "@/lib/companies/queries";
import { requireApiUser } from "@/lib/supabase/auth";
import { auditSaveSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  const limitResponse = enforceRateLimit(request, "audit-save", 20, 10 * 60_000);
  if (limitResponse) {
    return limitResponse;
  }

  const auth = await requireApiUser();
  if (auth instanceof Response) {
    return auth;
  }

  const parsed = await parseJsonBody(request, auditSaveSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }

  const { supabase, user } = auth;
  const companyResult = await getCompanyById(supabase, parsed.companyId);
  if (companyResult.error || !companyResult.data) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const summary = summarizeAuditText(parsed.modelResponse);

  if (parsed.auditId) {
    const { data, error } = await supabase
      .from("audits")
      .update({
        status: "completed",
        model_response: parsed.modelResponse,
        summary,
      })
      .eq("id", parsed.auditId)
      .eq("company_id", parsed.companyId)
      .select("id,company_id,status,mode,prompt,model_response,summary,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  }

  const { data, error } = await supabase
    .from("audits")
    .insert({
      company_id: parsed.companyId,
      owner_user_id: user.id,
      mode: "prompt",
      status: "completed",
      model_response: parsed.modelResponse,
      summary,
    })
    .select("id,company_id,status,mode,prompt,model_response,summary,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

