# Implementation Guide: Standardized `llms.txt` and AI Crawler Support in Next.js

> **Purpose:** This guide provides a complete blueprint for implementing `/llms.txt`, `/llms-full.txt`, AI-optimized `robots.ts`, discovery tags, and an automated verification test suite in any Next.js (App Router) or modern web project.
>
> Based on the battle-tested implementation from commit `3c259a4` (`feat: enhance SEO and AI crawler support with llms.txt and robots.txt updates`).

---

## Table of Contents
1. [Overview & Why This Matters](#1-overview--why-this-matters)
2. [Architecture: Single Source of Truth](#2-architecture-single-source-of-truth)
3. [Step 1: Content Generator (`lib/llms/content.ts`)](#3-step-1-content-generator-libllmscontentts)
4. [Step 2: Static Route Handlers (`app/llms.txt/route.ts` & `app/llms-full.txt/route.ts`)](#4-step-2-static-route-handlers)
5. [Step 3: AI Crawler-Friendly `robots.ts` (`app/robots.ts`)](#5-step-3-ai-crawler-friendly-robotsts)
6. [Step 4: Discovery Header & Server-Rendered JSON-LD (`app/layout.tsx`)](#6-step-4-discovery-header--server-rendered-json-ld)
7. [Step 5: Automated Verification Script (`scripts/llms-check.mjs`)](#7-step-5-automated-verification-script-scriptsllms-checkmjs)
8. [Step 6: NPM Scripts & Build Integration (`package.json`)](#8-step-6-npm-scripts--build-integration)
9. [Key Pitfalls & Best Practices](#9-key-pitfalls--best-practices)

---

## 1. Overview & Why This Matters

AI assistants and search engines (such as **ChatGPT / GPTBot**, **ClaudeBot / PerplexityBot**, **Google SGE / Gemini**, and **Mistral**) crawl the web differently than traditional search engines:
- They often do **not execute client-side JavaScript** (React/CSR).
- They prefer clean, structured, factual Markdown over parsing heavy HTML DOM trees.
- The standard at [llmstxt.org](https://llmstxt.org) specifies:
  - `/llms.txt`: A concise markdown index of the website for context windows and fast queries.
  - `/llms-full.txt`: A single-file, exhaustive text digest containing all public facts, products, addresses, leadership, and resources.

---

## 2. Architecture: Single Source of Truth

Avoid maintaining a static `.txt` file in `public/` that quickly becomes outdated. Instead:
1. **Export data structures** directly from your data files (e.g. `data/*.json`, CMS clients, or typed TypeScript constants in page files).
2. Generate markdown dynamically during the build step using Next.js `force-static` route handlers.
3. Every time your site or data updates and is rebuilt, `llms.txt` and `llms-full.txt` update automatically without manual intervention.

```
┌─────────────────────────────────────────┐
│ Site Data (JSON, DB, Page Data Models)  │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│     lib/llms/content.ts (Generator)     │
│   - buildLlmsTxt()                      │
│   - buildLlmsFullTxt()                  │
└────────────┬──────────────────────┬─────┘
             │                      │
             ▼                      ▼
┌───────────────────────┐ ┌────────────────────────┐
│ app/llms.txt/route.ts │ │app/llms-full.txt/route │
│ (force-static / 200)  │ │ (force-static / 200)   │
└───────────────────────┘ └────────────────────────┘
```

---

## 3. Step 1: Content Generator (`lib/llms/content.ts`)

Create `lib/llms/content.ts` (or equivalent utility directory). This file compiles your application's data into Markdown complying with [llmstxt.org](https://llmstxt.org).

### Generator Blueprint

```typescript
// lib/llms/content.ts

// 1. Import your site configs and content data
import siteConfig from "@/config/site.json"; // Or your constants/CMS

export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.example.com";
export const SITE_NAME = "Your Company Name";

// Helper to normalize and ensure full canonical URLs
const url = (path: string) => (path === "/" ? `${BASE_URL}/` : `${BASE_URL}${path}`);

// Helper to clean recurring suffixes and extra whitespace
const clean = (text: string) => text.replace(/\s+/g, " ").trim();

// Format markdown link with optional description: - [Title](href): Description
const link = (title: string, href: string, description?: string) =>
  `- [${title}](${href})${description ? `: ${clean(description)}` : ""}`;

// Helper to encode links that might contain spaces or parentheses
export const encodeHref = (href: string) =>
  encodeURI(decodeURI(href)).replace(/\(/g, "%28").replace(/\)/g, "%29");

/**
 * 1. buildLlmsTxt: Concise index file (< 50 KB, ~10,000 tokens)
 * Must contain:
 * - Exactly one H1 (`# Site Name`)
 * - One blockquote summary (`> Summary`)
 * - Key company facts
 * - Categorized H2 sections with markdown links
 * - A final "## Optional" section
 */
export function buildLlmsTxt(): string {
  const lines: string[] = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_NAME} is a [brief 1-2 sentence core value proposition and business summary].`,
    "",
    "## Key Facts",
    "",
    `- Organization: ${SITE_NAME}`,
    `- Headquarters: [City, State, Country]`,
    `- Website: ${BASE_URL}`,
    `- Contact: contact@example.com`,
    "",
    `For the complete single-file text content of this website, see ${url("/llms-full.txt")}.`,
    "",
    "## Main Sections",
    "",
    link("Home", url("/"), "Overview of our platform and key solutions"),
    link("About Us", url("/about"), "Company background, vision, and mission"),
    link("Products & Services", url("/services"), "Core offerings and catalog"),
    link("Contact", url("/contact"), "Office locations, phone numbers, and support"),
    "",
    "## Optional",
    "",
    link("Full Content for LLMs", url("/llms-full.txt"), "Single-file exhaustive content digest"),
    link("Sitemap", url("/sitemap.xml")),
    link("Privacy Policy", url("/privacy-policy")),
    link("Terms of Service", url("/terms")),
    "",
  ];

  return lines.join("\n");
}

/**
 * 2. buildLlmsFullTxt: Single-file complete content digest (< 500 KB)
 * Contains the full textual body of all pages, office addresses, FAQs, and product specs.
 */
export function buildLlmsFullTxt(): string {
  const lines: string[] = [
    `# ${SITE_NAME} — Full Site Content`,
    "",
    `> Complete public content of ${BASE_URL} in one Markdown document for AI assistants and search engines. Short index is at ${url("/llms.txt")}.`,
    "",
    "## Company Overview",
    "",
    `Source: ${url("/about")}`,
    "",
    "Detailed paragraph describing company history, core competencies, vision, and values...",
    "",
    "## Offices & Locations",
    "",
    `Source: ${url("/contact")}`,
    "",
    "- **Headquarters**: 123 Main Street, Suite 400, City, PostalCode",
    "- **Support**: support@example.com | +1 (555) 019-2834",
    "",
    "## Products & Services",
    "",
    `Source: ${url("/services")}`,
    "",
    "### Service A",
    "Comprehensive description of Service A, specifications, and use cases.",
    "",
    "### Service B",
    "Comprehensive description of Service B, specifications, and use cases.",
    "",
    "## Legal",
    "",
    link("Privacy Policy", url("/privacy-policy")),
    link("Terms of Service", url("/terms")),
    "",
  ];

  return lines.join("\n");
}
```

---

## 4. Step 2: Static Route Handlers

Create Next.js App Router handlers serving the text files with proper HTTP headers and static caching.

### File: `app/llms.txt/route.ts`

```typescript
import { buildLlmsTxt } from "@/lib/llms/content";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
```

### File: `app/llms-full.txt/route.ts`

```typescript
import { buildLlmsFullTxt } from "@/lib/llms/content";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsFullTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
```

> **Why `force-static`?** Next.js will pre-render both files at build time into static assets while preserving dynamic generation during `next build`.

---

## 5. Step 3: AI Crawler-Friendly `robots.ts`

Configure `app/robots.ts` to:
1. Clearly whitelist AI user agents.
2. Direct bots to `/llms.txt` and `/llms-full.txt`.
3. Protect private/sensitive paths (e.g., `/api/`, admin routes).
4. **Avoid the First-Match Parser Bug**: Do not put blanket `allow: "/"` on `*`. Simple parsers (e.g., Python's `urllib.robotparser`) take the first matching rule, which can accidentally override disallow directives.

### File: `app/robots.ts`

```typescript
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.example.com";

// Sensitive routes to keep crawlers away from
const DISALLOW = ["/api/", "/admin/", "/private/"];

// Explicit list of known AI search bots and LLM scrapers
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "Amazonbot",
  "DuckAssistBot",
  "MistralAI-User",
  "cohere-ai",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Standard bots: everything is allowed by default; disallow sensitive routes
      {
        userAgent: "*",
        disallow: DISALLOW,
      },
      // AI Crawlers: explicitly welcomed, pointed to llms files, blocked from sensitive APIs
      {
        userAgent: AI_CRAWLERS,
        allow: ["/llms.txt", "/llms-full.txt"],
        disallow: DISALLOW,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
```

---

## 6. Step 4: Discovery Header & Server-Rendered JSON-LD

### Discovery Link Tag
Allow AI engines to discover `/llms.txt` automatically via `<head>` in `app/layout.tsx`.

### Critical Caution on JSON-LD & `next/script`
`next/script` (even with `strategy="beforeInteractive"`) inlines structured data as dynamic JavaScript hydration (`self.__next_s`), which AI scrapers without JavaScript engines **never execute**. 
Use a native `<script type="application/ld+json">` with escaped HTML brackets instead:

### File: `app/layout.tsx`

```tsx
import type { Metadata } from "next";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Your Company Name",
    url: "https://www.example.com",
    // ... rest of your organization schema
  };

  return (
    <html lang="en">
      <head>
        {/* Discovery link for AI crawlers */}
        <link
          rel="alternate"
          type="text/plain"
          href="/llms.txt"
          title="LLM-readable site summary"
        />

        {/* Server-rendered JSON-LD (visible without JavaScript) */}
        <script
          id="json-ld-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## 7. Step 5: Automated Verification Script (`scripts/llms-check.mjs`)

Create a zero-dependency Node.js ESM script (`scripts/llms-check.mjs`) to test your running site as an AI crawler would (no-JS HTML inspection, bot headers, link audits, token budget checks).

### File: `scripts/llms-check.mjs`

```javascript
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const checkExternal = args.includes("--external");
const BASE = (args.find((a) => !a.startsWith("--")) || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const AI_USER_AGENTS = {
  GPTBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
  ClaudeBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
  PerplexityBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
  "Google-Extended": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
};

console.log(`🤖 Running AI-Crawler & llms.txt validation against ${BASE}\n`);

let errors = 0;
let warnings = 0;
let checksPassed = 0;

const pass = (msg) => { checksPassed++; console.log(`  ✅ PASS: ${msg}`); };
const fail = (msg) => { errors++; console.log(`  ❌ FAIL: ${msg}`); };
const warn = (msg) => { warnings++; console.log(`  ⚠️ WARN: ${msg}`); };

const toLocal = (u) => (u.startsWith("/") ? BASE + u : u);

async function get(u, { ua = AI_USER_AGENTS.GPTBot } = {}) {
  try {
    const res = await fetch(toLocal(u), { headers: { "User-Agent": ua, Accept: "text/html,text/plain,*/*" } });
    return { res, body: await res.text() };
  } catch (err) {
    return { res: null, body: "", error: err.message };
  }
}

// -------------------------------------------------------------
// 1. Check endpoints & headers
console.log("1️⃣ Fetching /llms.txt and /llms-full.txt...");
const llms = await get("/llms.txt");
const llmsFull = await get("/llms-full.txt");

if (!llms.res) {
  fail(`Cannot reach ${BASE}/llms.txt. Ensure local server is running (npm run build && npm start).`);
  process.exit(1);
}

for (const [name, r, maxKb] of [["/llms.txt", llms, 50], ["/llms-full.txt", llmsFull, 500]]) {
  if (r.res?.status !== 200) { fail(`${name} returned HTTP ${r.res?.status}`); continue; }
  pass(`${name} returns 200 OK`);

  const type = r.res.headers.get("content-type") || "";
  if (/text\/(plain|markdown)/.test(type) && /utf-8/i.test(type)) pass(`${name} Content-Type is "${type}"`);
  else fail(`${name} Content-Type is invalid: "${type}"`);

  const kb = Buffer.byteLength(r.body) / 1024;
  if (kb <= maxKb) pass(`${name} is ${kb.toFixed(1)} KB (under ${maxKb} KB limit)`);
  else warn(`${name} is ${kb.toFixed(1)} KB (exceeds ${maxKb} KB limit)`);

  if (/\[object Object\]|undefined|NaN/.test(r.body)) fail(`${name} has unrendered data (e.g. [object Object])`);
  else pass(`${name} has clean text output`);
}

// -------------------------------------------------------------
// 2. Validate llmstxt.org structure
console.log("\n2️⃣ Validating llms.txt structure...");
const lines = llms.body.split("\n");

if (/^# \S/.test(lines[0])) pass(`Starts with single H1: "${lines[0]}"`);
else fail("First line must be H1 title (# Site Name)");

if (lines.filter((l) => /^# /.test(l)).length === 1) pass("Contains exactly one H1");
else fail("llms.txt must have only 1 top-level H1");

if (lines.some((l) => l.startsWith("> "))) pass("Contains blockquote summary");
else fail("Missing blockquote summary (`> summary`)");

const h2s = lines.filter((l) => /^## /.test(l));
if (h2s.length) pass(`Has ${h2s.length} H2 sections`);
else fail("Missing H2 sections");

if (h2s.at(-1) === "## Optional") pass('"## Optional" is the last section');
else warn('Last section should be "## Optional" per standard');

// -------------------------------------------------------------
// 3. Robots.txt rules
console.log("\n3️⃣ Testing robots.txt rules...");
const robots = await get("/robots.txt");
if (/^sitemap:\s*\S+/im.test(robots.body)) pass("robots.txt declares sitemap");
else fail("robots.txt missing sitemap declaration");

if (robots.body.includes("GPTBot")) pass("Explicitly mentions AI crawlers");
else warn("Consider explicitly configuring known AI crawlers in robots.txt");

// -------------------------------------------------------------
// 4. Discovery in Head
console.log("\n4️⃣ Verifying discovery tag in HTML...");
const home = await get("/");
if (home.body.includes('href="/llms.txt"')) pass("Home page contains <link rel=\"alternate\" href=\"/llms.txt\">");
else fail("Home page is missing /llms.txt discovery link");

if (home.body.includes('application/ld+json')) pass("Home page includes server-rendered JSON-LD");
else warn("Home page missing server-rendered JSON-LD in HTML");

// -------------------------------------------------------------
console.log("\n📊 Summary:");
console.log(`  Passed:   ${checksPassed}`);
console.log(`  Warnings: ${warnings}`);
console.log(`  Errors:   ${errors}\n`);

process.exit(errors ? 1 : 0);
```

---

## 8. Step 6: NPM Scripts & Build Integration

Update your project's `package.json` to expose the audit command:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "llms-check": "node scripts/llms-check.mjs"
  }
}
```

### Running Locally
```bash
# Build and run the production server
npm run build
npm start

# In a separate terminal, run the check
npm run llms-check

# To test against a live staging/production deployment:
npm run llms-check -- https://staging.example.com
```

### CI/CD Pipeline (GitHub Actions Example)
```yaml
name: AI Crawler & LLMS Audit

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - run: npm run start & npx wait-on http://localhost:3000
      - run: npm run llms-check
```

---

## 9. Key Pitfalls & Best Practices

| Area | Common Mistake | Recommended Solution |
| :--- | :--- | :--- |
| **Data Sync** | Hardcoding static `.txt` files in `/public`. | Export data structures and generate dynamically via `force-static` route handlers. |
| **Robots Parser Bug** | Using `allow: "/"` on `*` in `robots.ts`. | Avoid blanket `allow: "/"`. Simple parsers take the first matching rule, accidentally bypassing `disallow: "/api/"`. |
| **JSON-LD Crawling** | Using `next/script` for JSON-LD. | AI bots do not run JS. Use raw `<script type="application/ld+json">` with server HTML output. |
| **Link Encoding** | Unencoded spaces and `()` in file URLs. | Parentheses `(` and `)` break Markdown link parsing. Use `encodeURI().replace(/\(/g, "%28").replace(/\)/g, "%29")`. |
| **Token Budgets** | Giant `/llms.txt` files (> 100 KB). | Keep `/llms.txt` compact (< 50 KB / ~10k tokens). Put extensive data in `/llms-full.txt`. |
| **Placeholder Data** | Leaking test values or placeholder IDs. | Filter out placeholder values (e.g. test ISINs, dummy phones) in `content.ts`. |

