import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// Transactional / auth-only flows with no search value. robots.txt is advisory, not access control.
const DISALLOW = ["/login", "/payment", "/success"];

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

// No sitemap is declared: the root layout's canonical points to https://jojoapp.in,
// so listing this host's URLs in a sitemap would send search engines conflicting signals.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, disallow: DISALLOW },
    ],
  };
}
