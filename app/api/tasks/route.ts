import { NextResponse, type NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/api/validation";
import { enforceRateLimit } from "@/lib/api/security";
import { getCompanyById } from "@/lib/companies/queries";
import { requireApiUser } from "@/lib/supabase/auth";
import { taskCreateSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  const limitResponse = enforceRateLimit(request, "task-create", 40, 10 * 60_000);
  if (limitResponse) {
    return limitResponse;
  }

  const auth = await requireApiUser();
  if (auth instanceof Response) {
    return auth;
  }

  const parsed = await parseJsonBody(request, taskCreateSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }

  const { supabase, user } = auth;
  const companyResult = await getCompanyById(supabase, parsed.companyId);
  if (companyResult.error || !companyResult.data) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      company_id: parsed.companyId,
      title: parsed.title,
      status: parsed.status || "open",
      due_at: parsed.dueAt || null,
      priority: parsed.priority || "medium",
      notes: parsed.notes || null,
      created_by: user.id,
      owner_user_id: user.id,
    })
    .select("id,company_id,title,status,priority,due_at,notes,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

