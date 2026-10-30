#!/usr/bin/env node
/**
 * Validates /llms.txt, /llms-full.txt, /robots.txt, home-page discovery metadata and
 * security headers against a running server (zero dependencies, Node 18+).
 *
 *   npm run build && npm start               # in one terminal
 *   npm run llms-check                       # http://localhost:3000
 *   npm run llms-check -- https://subscription.jojoapp.in --check-links
 *
 * Flags:
 *   --site=<url>      Expected public origin in generated URLs (default: $LLMS_SITE_URL or https://subscription.jojoapp.in)
 *   --check-links     Fetch every own-site URL in the files (mapped onto the base URL) and require a 200 with no redirect
 *   --external        Also fetch external links (slower, depends on third-party sites)
 *   --expect-hsts     Fail instead of warn when Strict-Transport-Security is missing
 *   --expect-sitemap  Fail when robots.txt has no Sitemap line
 */

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const BASE = (args.find((a) => !a.startsWith("--")) || process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const SITE = (option("site") || process.env.LLMS_SITE_URL || "https://subscription.jojoapp.in").replace(/\/+$/, "");

const LIMITS = { "/llms.txt": 50 * 1024, "/llms-full.txt": 500 * 1024 };
const ROBOTS_DISALLOW = ["/login", "/payment", "/success"];
const PRIVATE_PATHS = ["/login", "/payment", "/success", "/offer", "/campaign/", "/country/", "/api/", "/_next/"];
const SECRET_PATTERNS = [
  [/NEXT_PUBLIC_[A-Z_]+/, "environment variable name"],
  [/AIza[0-9A-Za-z_-]{35}/, "Google API key"],
  [/AKIA[0-9A-Z]{16}/, "AWS access key"],
  [/rzp_(live|test)_[0-9A-Za-z]+/, "Razorpay key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, "JWT"],
  [/\b(secret|password|api[_-]?key|access[_-]?token)\s*[:=]/i, "credential assignment"],
  [/localhost|127\.0\.0\.1|0\.0\.0\.0/, "local address"],
  [/\[object Object\]|\bundefined\b|\bNaN\b/, "unrendered value"],
];
const UA = "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)";

let errors = 0;
let warnings = 0;
let passed = 0;
const pass = (msg) => { passed++; console.log(`  ✅ PASS: ${msg}`); };
const fail = (msg) => { errors++; console.log(`  ❌ FAIL: ${msg}`); };
const warn = (msg) => { warnings++; console.log(`  ⚠️  WARN: ${msg}`); };

async function get(path, { redirect = "manual", base = BASE } = {}) {
  const url = path.startsWith("http") ? path : base + path;
  try {
    const res = await fetch(url, { redirect, headers: { "User-Agent": UA, Accept: "text/html,text/plain,*/*" } });
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { res, bytes, body: new TextDecoder().decode(bytes) };
  } catch (err) {
    return { res: null, bytes: new Uint8Array(), body: "", error: err.message };
  }
}

// Markdown link targets plus bare URLs
const extractUrls = (text) => [
  ...new Set([
    ...[...text.matchAll(/\]\((\S+?)\)/g)].map((m) => m[1]),
    ...[...text.matchAll(/(?<![(\w])https?:\/\/[^\s)>\]]+/g)].map((m) => m[0].replace(/[.,;:]+$/, "")),
  ]),
];

console.log(`🤖 llms.txt / crawler / header validation against ${BASE} (expected site: ${SITE})\n`);

// Guard against validating some other app that happens to be on the same port (e.g. another project on :3000)
const EXPECTED_H1 = "# JOJO Gold";
const identity = await get("/llms.txt");
const firstLine = identity.body.split("\n")[0].trim();
if (identity.res?.status === 200 && !firstLine.startsWith(EXPECTED_H1)) {
  console.log(`  ❌ ${BASE} is not the JOJO Gold campaign site: its /llms.txt starts with "${firstLine}".`);
  console.log("     Another app is probably running on this port. Pass the campaign server's URL, e.g. npm run llms-check -- http://localhost:3123\n");
  process.exit(2);
}

// -------------------------------------------------------------
console.log("1️⃣  Text endpoints");
const files = {};
for (const [path, maxBytes] of Object.entries(LIMITS)) {
  const r = await get(path);
  if (!r.res) { fail(`Cannot reach ${BASE}${path} (${r.error}). Is the server running?`); continue; }
  if (r.res.status !== 200) { fail(`${path} returned HTTP ${r.res.status}${r.res.headers.get("location") ? ` → ${r.res.headers.get("location")}` : ""}`); continue; }
  files[path] = r;
  pass(`${path} returns 200 without redirect`);

  const type = r.res.headers.get("content-type") || "";
  if (/^text\/plain/i.test(type) && /charset=utf-8/i.test(type)) pass(`${path} Content-Type is "${type}"`);
  else fail(`${path} Content-Type is "${type}" (expected text/plain; charset=utf-8)`);

  try {
    new TextDecoder("utf-8", { fatal: true }).decode(r.bytes);
    pass(`${path} is valid UTF-8`);
  } catch {
    fail(`${path} is not valid UTF-8`);
  }

  if (r.bytes.length === 0 || !r.body.trim()) fail(`${path} is empty`);
  else if (r.bytes.length > maxBytes) fail(`${path} is ${(r.bytes.length / 1024).toFixed(1)} KB (limit ${maxBytes / 1024} KB)`);
  else pass(`${path} is ${(r.bytes.length / 1024).toFixed(1)} KB (limit ${maxBytes / 1024} KB)`);

  if (/<\/?(html|body|div|script)\b/i.test(r.body)) fail(`${path} contains HTML markup`);
  else pass(`${path} contains no HTML markup`);

  const cache = r.res.headers.get("cache-control");
  if (cache) pass(`${path} Cache-Control: ${cache}`);
  else warn(`${path} has no Cache-Control header`);
}

// -------------------------------------------------------------
console.log("\n2️⃣  llmstxt.org structure");
const llms = files["/llms.txt"]?.body || "";
if (llms) {
  const lines = llms.split("\n");
  if (/^# \S/.test(lines[0])) pass(`Starts with H1: "${lines[0]}"`); else fail("First line must be an H1 (# Name)");
  if (lines.filter((l) => /^# /.test(l)).length === 1) pass("Exactly one H1"); else fail("llms.txt must have exactly one H1");
  if (lines.some((l) => l.startsWith("> "))) pass("Has blockquote summary"); else fail("Missing blockquote summary");
  const h2s = lines.filter((l) => /^## /.test(l));
  if (h2s.length) pass(`Has ${h2s.length} H2 sections`); else fail("Missing H2 sections");
  if (h2s.at(-1) === "## Optional") pass('"## Optional" is the last section'); else warn('Last H2 should be "## Optional"');
}
const full = files["/llms-full.txt"]?.body || "";
if (full) {
  if (/^# \S/.test(full) && full.split("\n").filter((l) => /^# /.test(l)).length === 1) pass("llms-full.txt has exactly one H1");
  else fail("llms-full.txt must start with a single H1");
}

// -------------------------------------------------------------
console.log("\n3️⃣  URLs and content safety");
const ownLinks = new Set();
for (const [path, r] of Object.entries(files)) {
  if (!r?.body) continue;
  const urls = extractUrls(r.body);

  const malformed = urls.filter((u) => { try { return !/^https:$/.test(new URL(u).protocol); } catch { return true; } });
  if (malformed.length) fail(`${path} has non-https or malformed URLs: ${malformed.join(", ")}`);
  else pass(`${path}: all ${urls.length} URLs are absolute https`);

  const own = urls.filter((u) => { try { return new URL(u).hostname === new URL(SITE).hostname; } catch { return false; } });
  const wrongOrigin = own.filter((u) => !u.startsWith(`${SITE}/`));
  if (wrongOrigin.length) fail(`${path} has own-site URLs not on ${SITE}: ${wrongOrigin.join(", ")}`);
  else pass(`${path}: own-site URLs use ${SITE}`);
  own.forEach((u) => ownLinks.add(u));

  const linkTargets = [...r.body.matchAll(/\]\((\S+?)\)/g)].map((m) => m[1]);
  const dupes = linkTargets.filter((u, i) => linkTargets.indexOf(u) !== i);
  if (dupes.length) fail(`${path} lists duplicate URLs: ${[...new Set(dupes)].join(", ")}`);
  else pass(`${path}: no duplicate link URLs`);

  const privateHits = own.filter((u) => PRIVATE_PATHS.some((p) => new URL(u).pathname.startsWith(p)));
  if (privateHits.length) fail(`${path} links private/transactional routes: ${privateHits.join(", ")}`);
  else pass(`${path}: no private or transactional routes`);

  const secretHits = SECRET_PATTERNS.filter(([re]) => re.test(r.body)).map(([, name]) => name);
  if (secretHits.length) fail(`${path} contains suspicious content: ${secretHits.join(", ")}`);
  else pass(`${path}: no secret-like or unrendered content`);
}

if (flag("check-links")) {
  for (const u of ownLinks) {
    const target = BASE + new URL(u).pathname + new URL(u).search;
    const r = await get(target);
    if (r.res?.status === 200) pass(`${new URL(u).pathname} → 200`);
    else fail(`${u} → ${r.res?.status ?? r.error}${r.res?.headers.get("location") ? ` → ${r.res.headers.get("location")}` : ""} (checked ${target})`);
  }
}
if (flag("external")) {
  const external = new Set(Object.values(files).flatMap((r) => (r?.body ? extractUrls(r.body) : [])).filter((u) => !ownLinks.has(u)));
  for (const u of external) {
    const r = await get(u, { redirect: "follow" });
    if (r.res && r.res.status < 400) pass(`${u} → ${r.res.status}`);
    else warn(`${u} → ${r.res?.status ?? r.error}`);
  }
}

// -------------------------------------------------------------
console.log("\n4️⃣  robots.txt");
const robots = await get("/robots.txt");
if (robots.res?.status !== 200) {
  fail(`/robots.txt returned HTTP ${robots.res?.status ?? robots.error}`);
} else {
  pass("/robots.txt returns 200 without redirect");
  if (/^text\/plain/i.test(robots.res.headers.get("content-type") || "")) pass("robots.txt is text/plain");
  else fail(`robots.txt Content-Type is "${robots.res.headers.get("content-type")}"`);

  const lines = robots.body.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const invalid = lines.filter((l) => !/^(user-agent|allow|disallow|sitemap|crawl-delay|host):\s*\S*/i.test(l));
  if (invalid.length) fail(`robots.txt has invalid lines: ${invalid.join(" | ")}`); else pass("robots.txt lines are valid directives");

  if (/^user-agent:\s*\*\s*$/im.test(robots.body)) pass('robots.txt has a "User-agent: *" group'); else fail('robots.txt is missing "User-agent: *"');
  if (/^disallow:\s*\/\s*$/im.test(robots.body)) fail('robots.txt contains "Disallow: /" (blocks the whole site)');
  else pass("robots.txt does not block the whole site");
  const missing = ROBOTS_DISALLOW.filter((p) => !new RegExp(`^disallow:\\s*${p.replace(/\//g, "\\/")}\\s*$`, "im").test(robots.body));
  if (missing.length) fail(`robots.txt missing Disallow for: ${missing.join(", ")}`); else pass(`robots.txt disallows ${ROBOTS_DISALLOW.join(", ")}`);
  if (/^disallow:\s*\/llms/im.test(robots.body)) fail("robots.txt disallows the llms files"); else pass("robots.txt does not block /llms*.txt");
  if (robots.body.includes("GPTBot")) pass("robots.txt names AI crawlers explicitly"); else warn("robots.txt does not name AI crawlers");

  const sitemaps = [...robots.body.matchAll(/^sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  if (!sitemaps.length && flag("expect-sitemap")) fail("robots.txt has no Sitemap line");
  else if (!sitemaps.length) pass("robots.txt declares no sitemap (none intended)");
  for (const s of sitemaps) {
    if (!s.startsWith(`${SITE}/`)) fail(`Sitemap ${s} is not on ${SITE}`);
    const r = await get(new URL(s).pathname);
    if (r.res?.status === 200 && /xml/.test(r.res.headers.get("content-type") || "")) pass(`Sitemap ${s} returns XML`);
    else fail(`Sitemap ${s} → ${r.res?.status ?? r.error}`);
  }
}

// -------------------------------------------------------------
console.log("\n5️⃣  Home page metadata (no-JS HTML)");
const home = await get("/");
if (home.res?.status !== 200) {
  fail(`/ returned HTTP ${home.res?.status ?? home.error}`);
} else {
  if (/<link[^>]+rel="alternate"[^>]+type="text\/plain"[^>]+href="\/llms\.txt"/.test(home.body)) pass("Has <link rel=\"alternate\" type=\"text/plain\" href=\"/llms.txt\">");
  else fail("Missing /llms.txt discovery link");

  const ld = [...home.body.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (!ld.length) warn("No server-rendered JSON-LD");
  for (const [i, block] of ld.entries()) {
    try {
      const data = JSON.parse(block);
      pass(`JSON-LD #${i + 1} parses (@type ${data["@type"]})`);
    } catch (e) {
      fail(`JSON-LD #${i + 1} is invalid JSON: ${e.message}`);
    }
  }

  const canonical = home.body.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1];
  if (canonical) pass(`Canonical present: ${canonical}`); else fail("Canonical link missing");
  for (const tag of ["og:title", "og:description", "og:image", "twitter:card"]) {
    if (home.body.includes(`"${tag}"`)) pass(`${tag} present`); else fail(`${tag} missing`);
  }
  if (/<meta name="robots" content="[^"]*noindex/i.test(home.body)) fail("Home page is noindex"); else pass("Home page is indexable");
}

// -------------------------------------------------------------
console.log("\n6️⃣  Security headers");
for (const [path, r] of [["/", home], ["/llms.txt", files["/llms.txt"]]]) {
  const h = r?.res?.headers;
  if (!h) continue;
  const expect = {
    "x-content-type-options": /^nosniff$/i,
    "referrer-policy": /\S/,
    "x-frame-options": /^(sameorigin|deny)$/i,
    "permissions-policy": /\S/,
    "content-security-policy": /frame-ancestors/,
  };
  for (const [name, re] of Object.entries(expect)) {
    const value = h.get(name);
    if (value && re.test(value)) pass(`${path} ${name}: ${value}`); else fail(`${path} ${name} missing or unexpected: ${value}`);
  }
  const hsts = h.get("strict-transport-security");
  if (hsts) pass(`${path} strict-transport-security: ${hsts}`);
  else (flag("expect-hsts") ? fail : warn)(`${path} has no Strict-Transport-Security`);
  if (h.get("x-powered-by")) fail(`${path} exposes X-Powered-By: ${h.get("x-powered-by")}`); else pass(`${path} hides X-Powered-By`);
}

// -------------------------------------------------------------
console.log("\n📊 Summary");
console.log(`  Passed:   ${passed}`);
console.log(`  Warnings: ${warnings}`);
console.log(`  Errors:   ${errors}\n`);
process.exit(errors ? 1 : 0);
