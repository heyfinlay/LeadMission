interface AuditPromptInput {
  businessName: string;
  websiteUrl?: string | null;
  industry?: string | null;
  stage?: string | null;
  priority?: string | null;
  score?: number | null;
  notes?: string | null;
  scrapeSummary?: string | null;
  scrapeBullets?: string[];
}

export const buildAuditPrompt = (input: AuditPromptInput): string => {
  const bullets = (input.scrapeBullets || []).map((bullet) => `- ${bullet}`).join("\n") || "- No scrape bullets available";

  return `
You are an expert growth and operations consultant preparing an actionable audit.

Company profile:
- Business name: ${input.businessName}
- Website: ${input.websiteUrl || "Not provided"}
- Industry: ${input.industry || "Not provided"}
- Pipeline stage: ${input.stage || "Not provided"}
- Priority: ${input.priority || "Not provided"}
- Internal score: ${input.score ?? "Not provided"}

Internal notes:
${input.notes || "No additional internal notes."}

Latest website scrape summary:
${input.scrapeSummary || "No website scrape summary available."}

Website key bullets:
${bullets}

Audit framework:
1) Executive summary (plain-language)
2) What is working now (3-5 bullets)
3) Biggest revenue / conversion gaps (ranked)
4) Offer and messaging fixes
5) Funnel / website fixes (high impact first)
6) Quick wins for next 7 days
7) 30-day implementation roadmap
8) Metrics to track weekly
9) Risks / assumptions

Output requirements:
- Be specific and implementation-focused.
- Use markdown headings.
- Include a concise "Top 5 actions" list at the end.
`.trim();
};

export const summarizeAuditText = (value: string): string => {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.slice(0, 280);
};

