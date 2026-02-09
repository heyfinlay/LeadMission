import { notFound } from "next/navigation";
import { CompanyManageView } from "@/features/companies/company-manage-view";
import {
  getAudits,
  getCompanyById,
  getCompanyTasks,
  getLatestScrape,
  getPortalSettings,
  getProposals,
} from "@/lib/companies/queries";
import { createServerAuthClient, requireUser } from "@/lib/supabase/auth";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const resolvedParams = await params;
  const supabase = await createServerAuthClient();

  const [companyResult, latestScrapeResult, auditsResult, proposalsResult, portalResult, tasksResult] =
    await Promise.all([
      getCompanyById(supabase, resolvedParams.id),
      getLatestScrape(supabase, resolvedParams.id),
      getAudits(supabase, resolvedParams.id),
      getProposals(supabase, resolvedParams.id),
      getPortalSettings(supabase, resolvedParams.id),
      getCompanyTasks(supabase, resolvedParams.id),
    ]);

  if (companyResult.error || !companyResult.data) {
    notFound();
  }

  return (
    <CompanyManageView
      company={companyResult.data}
      latestScrape={latestScrapeResult.data || null}
      audits={auditsResult.data || []}
      proposals={proposalsResult.data || []}
      portalSettings={portalResult.data || null}
      tasks={tasksResult.data || []}
    />
  );
}

