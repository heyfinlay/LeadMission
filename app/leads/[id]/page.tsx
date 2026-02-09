import { redirect } from "next/navigation";

export default async function LeadDetailRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  redirect(`/companies/${resolvedParams.id}`);
}
