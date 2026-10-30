import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_PUBLIC_DYNAMIC_BUILD !== "true" && process.env.NODE_ENV !== "development";
// User treats the flag as an "Enable Logging" flag where false means NO LOGS and true means SHOW LOGS
const shouldRemoveConsole = process.env.NEXT_PUBLIC_CONSOLE_LOGGER_OFF === "false";

// Kept deliberately narrow: no script-src/connect-src CSP, because payment (Razorpay),
// social login, reCAPTCHA and analytics SDKs load from many third-party origins.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compiler: {
    removeConsole: shouldRemoveConsole,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Static hosts resolve trailing-slash URLs (e.g. /movies/dhabkaaro/) to a
  // folder's index.html. Without this, Next only emits movies/dhabkaaro.html,
  // which those hosts can't find, so they fall back to serving the root page.
  ...(isStaticExport ? { trailingSlash: true } : {
    async rewrites() {
      return [
        {
          source: "/link=:path(.*)",
          destination: "/",
        },
      ];
    },
  }),
};

export default nextConfig;
