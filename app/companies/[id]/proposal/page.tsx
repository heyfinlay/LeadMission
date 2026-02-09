import { notFound } from "next/navigation";
import { ProposalEditor } from "@/features/companies/proposal-editor";
import { getCompanyById, getLatestAudit, getLatestProposal } from "@/lib/companies/queries";
import { createServerAuthClient, requireUser } from "@/lib/supabase/auth";

export default async function CompanyProposalPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const resolvedParams = await params;
  const supabase = await createServerAuthClient();

  const [companyResult, latestAuditResult, latestProposalResult] = await Promise.all([
    getCompanyById(supabase, resolvedParams.id),
    getLatestAudit(supabase, resolvedParams.id),
    getLatestProposal(supabase, resolvedParams.id),
  ]);

  if (companyResult.error || !companyResult.data) {
    notFound();
  }

  return (
    <ProposalEditor
      companyId={companyResult.data.id}
      companyName={companyResult.data.business_name}
      latestAuditSummary={latestAuditResult.data?.summary || null}
      proposal={latestProposalResult.data || null}
    />
  );
}

