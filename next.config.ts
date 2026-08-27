import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_PUBLIC_DYNAMIC_BUILD !== "true" && process.env.NODE_ENV !== "development";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : undefined,
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
