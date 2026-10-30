/**
 * llms.txt / llms-full.txt generator (https://llmstxt.org)
 *
 * Single source of truth for both files. Content comes only from:
 * - facts this site already publishes (root metadata, footer links), and
 * - the campaign list in the runtime config, read exactly the way
 *   app/[[...slug]]/page.tsx resolves campaign pages, so every listed URL renders
 *   (entries without real poster artwork are treated as unpublished placeholders).
 *
 * Only titles and public URLs are taken from the config. Never add prices
 * (they vary per offer and country), API data, or private routes here.
 */
import footerData from "@/lib/data/footer.data.json";
import { env } from "@/lib/config/env";
import { fetchConfig } from "@/lib/config/app.config";
import { parseCampaignObject } from "@/lib/campaign/campaign.parser";
import { logger } from "@/lib/logger/logger";

export const SITE_URL = env.siteUrl;
export const SITE_NAME = "JOJO Gold";

export const LLMS_TXT_MAX_BYTES = 50 * 1024;
export const LLMS_FULL_TXT_MAX_BYTES = 500 * 1024;
const MAX_CAMPAIGN_PAGES = 200;
const MAX_TITLE_LENGTH = 120;

const MAIN_SITE_URL = "https://jojoapp.in/";
const HELP_URL = "https://help.jojoapp.in/en/support/home";
const TERMS_URL = "https://jojoapp.in/terms-conditions";
const PRIVACY_URL = "https://jojoapp.in/privacy-policy";
const CONTACT_URL = "https://jojolimited.com/contact";
const CAREERS_URL = "https://jojolimited.com/career";
const COMPANY_URL = "https://jojolimited.com/";

const BENEFITS = [
  "Exclusive content",
  "No video ads",
  "Watch on up to 4 devices",
  "Stream in Full HD 1080p",
];

// First path segments owned by app routes; a campaign path starting with one would be shadowed.
const RESERVED_SEGMENTS = new Set(["campaign", "country", "login", "offer", "payment", "success", "default", "llms.txt", "llms-full.txt", "robots.txt"]);
const SAFE_PATH = /^[a-z0-9]+(?:[-_][a-z0-9]+)*(?:\/[a-z0-9]+(?:[-_][a-z0-9]+)*)*$/i;

export interface CampaignPage {
  title: string;
  category: string;
  url: string;
}

const pageUrl = (path: string) => {
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (!clean) return `${SITE_URL}/`;
  return `${SITE_URL}/${clean}${env.trailingSlash ? "/" : ""}`;
};

// Collapse whitespace and drop characters that would break a Markdown link label
const clean = (text: string) => text.replace(/[\[\]<>`]/g, " ").replace(/\s+/g, " ").trim();

const link = (title: string, href: string, description?: string) =>
  `- [${clean(title)}](${href})${description ? `: ${clean(description)}` : ""}`;

const categoryLabel = (key: string) =>
  clean(key.replace(/[-_]+/g, " ")).replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Public campaign pages from the runtime config, deduplicated in the same
 * first-match order resolveCampaignPath uses. Returns [] if the config is unavailable.
 */
export async function getPublicCampaignPages(): Promise<CampaignPage[]> {
  try {
    const config = await fetchConfig();
    const campaign = parseCampaignObject(config?.devices?.platform?.misc?.[0]?.["campaign-object"]);
    const pages: CampaignPage[] = [];
    const seen = new Set<string>();

    for (const [category, value] of Object.entries(campaign)) {
      if (!Array.isArray(value)) continue;

      for (const entry of value) {
        if (pages.length >= MAX_CAMPAIGN_PAGES) return pages;
        if (!entry || typeof entry !== "object") continue;

        const { path, title, images } = entry as { path?: unknown; title?: unknown; images?: { poster?: unknown } };
        if (typeof path !== "string" || typeof title !== "string") continue;
        // Placeholder entries in the config (e.g. "Example Show") carry bare filenames instead of
        // CDN artwork; only list campaigns whose poster is a real absolute URL.
        if (typeof images?.poster !== "string" || !images.poster.startsWith("https://")) continue;

        const normalized = path.replace(/^\/+|\/+$/g, "");
        if (!SAFE_PATH.test(normalized)) continue;
        if (RESERVED_SEGMENTS.has(normalized.split("/")[0].toLowerCase())) continue;
        if (seen.has(normalized)) continue;

        const label = clean(title).slice(0, MAX_TITLE_LENGTH);
        if (!label) continue;

        seen.add(normalized);
        pages.push({ title: label, category: categoryLabel(category), url: pageUrl(normalized) });
      }
    }

    return pages;
  } catch (error) {
    logger.warn("[llms] Failed to load campaign pages", error);
    return [];
  }
}

const socialLinks = () =>
  footerData.social.platforms
    .filter((p) => ["facebook", "instagram", "youtube"].includes(p.id) && p.href.startsWith("https://"))
    .map((p) => link(p.label, p.href.replace(/#$/, "")));

const appLinks = () =>
  footerData.appDownload.buttons
    .filter((b) => b.href.startsWith("https://"))
    .map((b) => link(`JOJO app on ${b.label}`, b.href.replace(/&pcampaignid=[^&]*/, "")));

const SUMMARY =
  `${SITE_NAME} is the premium subscription for JOJO, a streaming app for movies, shows and natak from JOJO Limited. ` +
  `${SITE_URL.replace(/^https?:\/\//, "")} is the official JOJO Gold subscription and campaign site, where viewers see current offers, sign in and subscribe.`;

/** Concise index (< 50 KB) */
export async function buildLlmsTxt(): Promise<string> {
  const campaigns = await getPublicCampaignPages();

  const lines: string[] = [
    `# ${SITE_NAME}`,
    "",
    `> ${SUMMARY}`,
    "",
    "## Key Facts",
    "",
    `- Product: ${SITE_NAME}, premium subscription for the JOJO app`,
    "- Operator: JOJO Limited",
    `- Benefits: ${BENEFITS.join(", ")}`,
    "- Plans and prices: shown on this site during sign-up; they vary by offer and country",
    `- Subscription site: ${SITE_URL}/`,
    `- Main website: ${MAIN_SITE_URL}`,
    "",
    `For the full single-file version of this content, see ${SITE_URL}/llms-full.txt.`,
    "",
    "## Main Pages",
    "",
    link(`${SITE_NAME} subscription`, pageUrl("/"), "JOJO Gold benefits and current subscription offers"),
    "",
  ];

  if (campaigns.length) {
    lines.push("## Campaign Pages", "");
    for (const page of campaigns) lines.push(link(page.title, page.url, page.category));
    lines.push("");
  }

  lines.push(
    "## JOJO Apps",
    "",
    link("JOJO website", MAIN_SITE_URL, "Main JOJO streaming website"),
    ...appLinks(),
    "",
    "## Help & Legal",
    "",
    link("Help & Support", HELP_URL),
    link("Contact JOJO Limited", CONTACT_URL),
    link("Terms & Conditions", TERMS_URL),
    link("Privacy Policy", PRIVACY_URL),
    "",
    "## Optional",
    "",
    link("Full content for LLMs", `${SITE_URL}/llms-full.txt`, "Single-file version of this site's public content"),
    link("JOJO Limited", COMPANY_URL),
    link("Careers at JOJO Limited", CAREERS_URL),
    ...socialLinks(),
    "",
  );

  return lines.join("\n");
}

/** Full single-file digest (< 500 KB) */
export async function buildLlmsFullTxt(): Promise<string> {
  const campaigns = await getPublicCampaignPages();

  const lines: string[] = [
    `# ${SITE_NAME}: Full Site Content`,
    "",
    `> Public content of ${SITE_URL}/ in one Markdown document for AI assistants and search engines. The short index is at ${SITE_URL}/llms.txt.`,
    "",
    "## About JOJO Gold",
    "",
    `Source: ${pageUrl("/")}`,
    "",
    SUMMARY,
    "",
    "JOJO Gold members get:",
    "",
    ...BENEFITS.map((b) => `- ${b}`),
    "",
    "## How Subscribing Works",
    "",
    "1. Open the JOJO Gold home page or a campaign page and review the offer shown.",
    "2. Sign in with a JOJO account, using a phone number and one-time password (OTP).",
    "3. Choose a plan and pay at checkout by UPI or card. Some campaigns offer a free trial instead of an immediate payment.",
    "4. After a successful purchase, continue to the JOJO website or download the JOJO app to start watching.",
    "",
    "Plans, prices, trial periods and availability are shown on the site during sign-up. They vary by offer and country, so this document does not list them.",
    "",
  ];

  if (campaigns.length) {
    lines.push(
      "## Campaign Pages",
      "",
      "Each campaign page promotes one title available with JOJO Gold, with its poster, trailer and the current subscription offer.",
      "",
    );

    const byCategory = new Map<string, CampaignPage[]>();
    for (const page of campaigns) {
      byCategory.set(page.category, [...(byCategory.get(page.category) ?? []), page]);
    }
    for (const [category, pages] of byCategory) {
      lines.push(`### ${category}`, "");
      for (const page of pages) lines.push(link(page.title, page.url, `Watch ${page.title} on JOJO Gold`));
      lines.push("");
    }
  }

  lines.push(
    "## Get the JOJO App",
    "",
    link("JOJO website", MAIN_SITE_URL),
    ...appLinks(),
    "",
    "## Help, Contact & Legal",
    "",
    link("Help & Support", HELP_URL, "Help center for JOJO account, subscription and playback questions"),
    link("Contact JOJO Limited", CONTACT_URL),
    link("Terms & Conditions", TERMS_URL),
    link("Privacy Policy", PRIVACY_URL),
    "",
    "## Follow JOJO",
    "",
    ...socialLinks(),
    "",
    "## Company",
    "",
    link("JOJO Limited", COMPANY_URL, "Company that operates JOJO and JOJO Gold"),
    link("Careers", CAREERS_URL),
    "",
  );

  return lines.join("\n");
}
