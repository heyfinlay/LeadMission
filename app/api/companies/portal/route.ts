import { NextResponse, type NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/api/validation";
import { enforceRateLimit } from "@/lib/api/security";
import { requireApiUser } from "@/lib/supabase/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { portalUpdateSchema } from "@/lib/validation/schemas";

const findUserIdByEmail = async (email: string): Promise<string | null> => {
  const adminClient = createServiceRoleClient();
  let page = 1;
  const perPage = 200;

  // Search through multiple pages so larger projects still resolve correctly.
  while (page <= 20) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      return null;
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) {
      return user.id;
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
};

export async function PATCH(request: NextRequest) {
  const limitResponse = enforceRateLimit(request, "portal-update", 30, 60_000);
  if (limitResponse) {
    return limitResponse;
  }

  const auth = await requireApiUser();
  if (auth instanceof Response) {
    return auth;
  }

  const parsed = await parseJsonBody(request, portalUpdateSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }

  const { supabase, user } = auth;
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id,owner_user_id,client_user_id,client_email")
    .eq("id", parsed.companyId)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  if (company.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Only the owner can update portal settings." }, { status: 403 });
  }

  let clientUserIdPatch: string | null | undefined;
  let clientEmailPatch: string | null | undefined;
  let assignStatus = "unchanged";

  if (parsed.clientEmail !== undefined) {
    const normalizedEmail = parsed.clientEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      clientUserIdPatch = null;
      clientEmailPatch = null;
      assignStatus = "cleared";
    } else {
      const foundUserId = await findUserIdByEmail(normalizedEmail);
      clientUserIdPatch = foundUserId;
      clientEmailPatch = normalizedEmail;
      assignStatus = foundUserId ? "linked_to_existing_user" : "stored_for_later_invite";
    }
  }

  if (clientUserIdPatch !== undefined || clientEmailPatch !== undefined) {
    const { error } = await supabase
      .from("companies")
      .update({
        client_user_id: clientUserIdPatch,
        client_email: clientEmailPatch,
      })
      .eq("id", parsed.companyId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  if (parsed.portalEnabled !== undefined) {
    const { error } = await supabase.from("portal_settings").upsert(
      {
        company_id: parsed.companyId,
        portal_enabled: parsed.portalEnabled,
        owner_user_id: user.id,
      },
      {
        onConflict: "company_id",
      },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const { data: refreshedCompany, error: refreshedCompanyError } = await supabase
    .from("companies")
    .select("id,client_user_id,client_email")
    .eq("id", parsed.companyId)
    .single();

  const { data: portalSettings, error: portalError } = await supabase
    .from("portal_settings")
    .select("company_id,portal_enabled,updated_at")
    .eq("company_id", parsed.companyId)
    .maybeSingle();

  if (refreshedCompanyError || portalError) {
    return NextResponse.json(
      {
        error: refreshedCompanyError?.message || portalError?.message,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    data: {
      company: refreshedCompany,
      portalSettings: portalSettings || { company_id: parsed.companyId, portal_enabled: false },
      assignStatus,
    },
  });
}

