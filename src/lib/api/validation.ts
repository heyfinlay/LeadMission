import type { ZodTypeAny, infer as InferZod } from "zod";
import { NextResponse, type NextRequest } from "next/server";

export const parseJsonBody = async <TSchema extends ZodTypeAny>(
  request: NextRequest,
  schema: TSchema,
): Promise<InferZod<TSchema> | NextResponse> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload.",
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  return parsed.data;
};

