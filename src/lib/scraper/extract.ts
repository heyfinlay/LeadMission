interface ExtractedWebsiteContent {
  title: string | null;
  metaDescription: string | null;
  h1: string[];
  h2: string[];
  visibleText: string;
  keyBullets: string[];
}

const decodeEntities = (value: string): string =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

const cleanText = (value: string): string =>
  decodeEntities(value)
    .replace(/\s+/g, " ")
    .trim();

const extractTagText = (html: string, tag: "title" | "h1" | "h2"): string[] => {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const matches: string[] = [];
  let match = regex.exec(html);
  while (match) {
    const text = cleanText(match[1] || "");
    if (text) {
      matches.push(text);
    }
    match = regex.exec(html);
  }

  return matches;
};

const extractMetaDescription = (html: string): string | null => {
  const metaTagRegex = /<meta[^>]*name=["']description["'][^>]*>/i;
  const tag = html.match(metaTagRegex)?.[0];
  if (!tag) {
    return null;
  }

  const contentMatch = tag.match(/content=["']([^"']*)["']/i);
  if (!contentMatch?.[1]) {
    return null;
  }

  const value = cleanText(contentMatch[1]);
  return value || null;
};

const toVisibleText = (html: string): string => {
  const withoutScript = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?>[\s\S]*?<\/noscript>/gi, " ");

  const withoutTags = withoutScript
    .replace(/<\/(p|div|section|article|h1|h2|h3|h4|h5|h6|li|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return cleanText(withoutTags);
};

const buildKeyBullets = (title: string | null, metaDescription: string | null, h1: string[], h2: string[]): string[] => {
  const bullets = new Set<string>();

  if (title) {
    bullets.add(`Title focus: ${title}`);
  }
  if (metaDescription) {
    bullets.add(`Meta summary: ${metaDescription}`);
  }
  if (h1[0]) {
    bullets.add(`Primary heading: ${h1[0]}`);
  }

  h2.slice(0, 3).forEach((heading) => bullets.add(`Section: ${heading}`));

  return [...bullets];
};

export const extractWebsiteContent = (html: string): ExtractedWebsiteContent => {
  const title = extractTagText(html, "title")[0] || null;
  const h1 = extractTagText(html, "h1");
  const h2 = extractTagText(html, "h2");
  const metaDescription = extractMetaDescription(html);
  const visibleText = toVisibleText(html);
  const keyBullets = buildKeyBullets(title, metaDescription, h1, h2);

  return {
    title,
    metaDescription,
    h1,
    h2,
    visibleText,
    keyBullets,
  };
};

export const summarizeScrape = (content: ExtractedWebsiteContent): string => {
  const summaryParts: string[] = [];
  if (content.title) {
    summaryParts.push(content.title);
  }
  if (content.metaDescription) {
    summaryParts.push(content.metaDescription);
  }
  if (content.h1[0]) {
    summaryParts.push(`Core message: ${content.h1[0]}`);
  }

  if (summaryParts.length === 0) {
    summaryParts.push(content.visibleText.slice(0, 240));
  }

  return summaryParts.join(" | ").slice(0, 700);
};

