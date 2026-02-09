import { NextResponse, type NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/api/validation";
import { enforceRateLimit } from "@/lib/api/security";
import { requireApiUser } from "@/lib/supabase/auth";
import { extractWebsiteContent, summarizeScrape } from "@/lib/scraper/extract";
import { scrapeSchema } from "@/lib/validation/schemas";

const SCRAPE_TIMEOUT_MS = 12_000;

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export async function POST(request: NextRequest) {
  const limitResponse = enforceRateLimit(request, "website-scrape", 15, 10 * 60_000);
  if (limitResponse) {
    return limitResponse;
  }

  const auth = await requireApiUser();
  if (auth instanceof Response) {
    return auth;
  }

  const parsed = await parseJsonBody(request, scrapeSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }

  if (!isHttpUrl(parsed.url)) {
    return NextResponse.json({ error: "Only http(s) URLs are supported." }, { status: 400 });
  }

  const { supabase, user } = auth;
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id,business_name")
    .eq("id", parsed.companyId)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);

  try {
    const response = await fetch(parsed.url, {
      headers: {
        "User-Agent": "MissionControlBot/1.0 (+https://missioncontrol.local)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Scrape failed with status ${response.status}.`,
        },
        { status: 400 },
      );
    }

    const html = await response.text();
    const extracted = extractWebsiteContent(html);
    const summary = summarizeScrape(extracted);

    const { data, error } = await supabase
      .from("website_scrapes")
      .insert({
        company_id: parsed.companyId,
        url: parsed.url,
        raw_text: extracted.visibleText.slice(0, 100_000),
        extracted_json: {
          title: extracted.title,
          metaDescription: extracted.metaDescription,
          h1: extracted.h1,
          h2: extracted.h2,
          keyBullets: extracted.keyBullets,
        },
        summary,
        owner_user_id: user.id,
      })
      .select("id,company_id,url,summary,extracted_json,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data,
      company: {
        id: company.id,
        business_name: company.business_name,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected scrape error.";
    return NextResponse.json({ error: message }, { status: 400 });
  } finally {
    clearTimeout(timeout);
  }
}

