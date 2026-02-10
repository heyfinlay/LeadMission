import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/api/validation";
import { enforceRateLimit } from "@/lib/api/security";
import { hasSessionCookie, logAuthDebug } from "@/lib/supabase/debug";
import { requireApiUser } from "@/lib/supabase/auth";
import { companyCreateSchema } from "@/lib/validation/schemas";
import { listCompanies } from "@/lib/companies/queries";

export async function GET() {
  const cookieStore = await cookies();
  const auth = await requireApiUser();
  logAuthDebug("api:companies:get", {
    route: "/api/companies",
    hasSessionCookie: hasSessionCookie(cookieStore.getAll()),
    hasUser: !(auth instanceof Response),
  });

  if (auth instanceof Response) {
    return auth;
  }

  const { supabase } = auth;

  const companiesResult = await listCompanies(supabase);
  if (companiesResult.error) {
    return NextResponse.json({ error: companiesResult.error.message }, { status: 400 });
  }

  const companyIds = companiesResult.data.map((company) => company.id);
  const portalResult = companyIds.length
    ? await supabase
        .from("portal_settings")
        .select("company_id,portal_enabled")
        .in("company_id", companyIds)
    : { data: [], error: null };

  if (portalResult.error) {
    return NextResponse.json({ error: portalResult.error.message }, { status: 400 });
  }

  const portalByCompany = new Map(
    (portalResult.data || []).map((row) => [row.company_id, row.portal_enabled]),
  );

  const data = companiesResult.data.map((company) => ({
    ...company,
    portal_enabled: portalByCompany.get(company.id) || false,
  }));

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const limitResponse = enforceRateLimit(request, "create-company", 20, 60_000);
  if (limitResponse) {
    return limitResponse;
  }

  const cookieStore = await cookies();
  const auth = await requireApiUser();
  logAuthDebug("api:companies:post", {
    route: "/api/companies",
    hasSessionCookie: hasSessionCookie(cookieStore.getAll()),
    hasUser: !(auth instanceof Response),
  });

  if (auth instanceof Response) {
    return auth;
  }

  const parsed = await parseJsonBody(request, companyCreateSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }

  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("companies")
    .insert({
      business_name: parsed.businessName,
      website_url: parsed.websiteUrl || null,
      industry: parsed.industry || null,
      stage: parsed.stage || "Cold",
      priority: parsed.priority || "Medium",
      score: parsed.score ?? 50,
      notes: parsed.notes || null,
      owner_user_id: user.id,
    })
    .select("id,business_name,website_url,industry,stage,priority,score,notes,created_at,updated_at,client_user_id,client_email")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
