import Link from "next/link";
import { Panel } from "@/components/primitives/panel";
import { ToneBadge } from "@/components/primitives/tone-badge";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { listCompanies } from "@/lib/companies/queries";
import { formatDateTime } from "@/lib/date";
import { requireUser, createServerAuthClient } from "@/lib/supabase/auth";

export default async function CompaniesPage() {
  await requireUser();
  const supabase = await createServerAuthClient();

  const [companiesResult, portalResult] = await Promise.all([
    listCompanies(supabase),
    supabase.from("portal_settings").select("company_id,portal_enabled"),
  ]);

  if (companiesResult.error) {
    return (
      <Panel title="Companies" subtitle="Supabase-backed company index">
        <p className="text-sm text-red-300">Could not load companies: {companiesResult.error.message}</p>
      </Panel>
    );
  }

  const portalByCompany = new Map((portalResult.data || []).map((row) => [row.company_id, row.portal_enabled]));
  const companies = companiesResult.data || [];

  return (
    <Panel title="Companies" subtitle="Supabase-backed operating accounts">
      <div className="mb-4">
        <Link href="/companies/new">
          <UnderlitButton>Create Company</UnderlitButton>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-700/70 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-2 py-2">Business</th>
              <th className="px-2 py-2">Stage</th>
              <th className="px-2 py-2">Priority</th>
              <th className="px-2 py-2">Score</th>
              <th className="px-2 py-2">Portal</th>
              <th className="px-2 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id} className="border-b border-slate-800/70 hover:bg-slate-800/40">
                <td className="px-2 py-3">
                  <Link href={`/companies/${company.id}`} className="font-semibold text-cyan-200 hover:text-cyan-100">
                    {company.business_name}
                  </Link>
                  <p className="mt-1 text-xs text-slate-400">{company.website_url || company.industry || "-"}</p>
                </td>
                <td className="px-2 py-3 text-slate-200">{company.stage}</td>
                <td className="px-2 py-3">
                  <ToneBadge
                    label={company.priority}
                    tone={company.priority === "Critical" ? "danger" : company.priority === "High" ? "warn" : "default"}
                  />
                </td>
                <td className="px-2 py-3 text-slate-200">{company.score}</td>
                <td className="px-2 py-3">
                  <ToneBadge label={portalByCompany.get(company.id) ? "Enabled" : "Disabled"} tone={portalByCompany.get(company.id) ? "success" : "default"} />
                </td>
                <td className="px-2 py-3 text-slate-300">{formatDateTime(company.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

