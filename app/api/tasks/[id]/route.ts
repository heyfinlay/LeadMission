import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/api/security";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/supabase/auth";
import { taskUpdateSchema } from "@/lib/validation/schemas";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const limitResponse = enforceRateLimit(request, "task-update", 60, 10 * 60_000);
  if (limitResponse) {
    return limitResponse;
  }

  const auth = await requireApiUser();
  if (auth instanceof Response) {
    return auth;
  }

  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid task id." }, { status: 400 });
  }

  const parsedBody = await parseJsonBody(request, taskUpdateSchema);
  if (parsedBody instanceof NextResponse) {
    return parsedBody;
  }

  const patch: Record<string, string | null> = {};
  if (parsedBody.status !== undefined) {
    patch.status = parsedBody.status;
  }
  if (parsedBody.dueAt !== undefined) {
    patch.due_at = parsedBody.dueAt || null;
  }
  if (parsedBody.priority !== undefined) {
    patch.priority = parsedBody.priority;
  }
  if (parsedBody.notes !== undefined) {
    patch.notes = parsedBody.notes || null;
  }

  const { supabase } = auth;
  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", parsedParams.data.id)
    .select("id,company_id,title,status,priority,due_at,notes,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

