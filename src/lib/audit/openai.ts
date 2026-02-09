import { getServerEnv } from "@/lib/env";

interface GenerateAuditWithOpenAIInput {
  prompt: string;
}

const extractOutputText = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };

  if (typeof candidate.output_text === "string" && candidate.output_text.trim()) {
    return candidate.output_text.trim();
  }

  const fragments =
    candidate.output
      ?.flatMap((item) => item.content || [])
      .filter((content) => content.type === "output_text" && typeof content.text === "string")
      .map((content) => content.text?.trim())
      .filter(Boolean) || [];

  if (fragments.length > 0) {
    return fragments.join("\n\n");
  }

  return null;
};

export const generateAuditWithOpenAI = async ({ prompt }: GenerateAuditWithOpenAIInput): Promise<string> => {
  const env = getServerEnv();

  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OPENAI_REQUEST_FAILED:${response.status}:${body}`);
  }

  const payload = (await response.json()) as unknown;
  const output = extractOutputText(payload);

  if (!output) {
    throw new Error("OPENAI_EMPTY_RESPONSE");
  }

  return output;
};

