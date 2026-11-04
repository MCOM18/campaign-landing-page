import { SITE_URL } from "@/lib/llms/content";

export const dynamic = "force-static";

// A route handler instead of app/robots.ts because the metadata API cannot emit comment lines.

// Transactional / auth-only flows with no search value. robots.txt is advisory, not access control.
const DISALLOW = ["/login", "/payment", "/success"];

// Explicitly crawlable machine-readable summaries for LLMs.
const ALLOW = ["/", "/llms.txt", "/llms-full.txt"];

// AI search and assistant crawlers, by the user-agent tokens their operators document.
// They get the same rules as "*"; listing them makes the policy explicit, because a
// crawler that matches a named group ignores the "*" group entirely.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "Amazonbot",
  "DuckAssistBot",
  "MistralAI-User",
  "CCBot",
];

const group = (userAgents: string[]) =>
  [
    ...userAgents.map((ua) => `User-Agent: ${ua}`),
    ...ALLOW.map((path) => `Allow: ${path}`),
    ...DISALLOW.map((path) => `Disallow: ${path}`),
  ].join("\n");

export function GET() {
  const body = [
    group(["*"]),
    group(AI_CRAWLERS),
    // Comments are ignored by crawlers; the Allow rules above are what grant access.
    `# LLM files\n llms.txt: ${SITE_URL}/llms.txt\n llms-full.txt: ${SITE_URL}/llms-full.txt`,
    // The sitemap lists this host's home and campaign pages, the same set as llms.txt.
    `Sitemap: ${SITE_URL}/sitemap.xml`,
  ].join("\n\n");

  return new Response(`${body}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
