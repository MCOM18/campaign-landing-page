import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_PUBLIC_DYNAMIC_BUILD !== "true" && process.env.NODE_ENV !== "development";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : undefined,
  ...(isStaticExport ? {} : {
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
