import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_PUBLIC_DYNAMIC_BUILD !== "true" && process.env.NODE_ENV !== "development";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : undefined,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.thesupercms.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.thesupercms.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.superott.in",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
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
