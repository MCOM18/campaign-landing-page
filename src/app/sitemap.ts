import type { MetadataRoute } from "next";
import { SITE_URL, getPublicCampaignPages } from "@/lib/llms/content";

// Same hourly refresh as llms.txt so new campaign pages appear without a redeploy
export const dynamic = "force-static";
export const revalidate = 3600;

// Home, the campaign pages that llms.txt lists, and the llms files themselves. No lastmod: the config carries no
// modification dates, and a made-up value is worse than none.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const campaigns = await getPublicCampaignPages();
  return [
    { url: `${SITE_URL}/` },
    ...campaigns.map((page) => ({ url: page.url })),
    { url: `${SITE_URL}/llms.txt` },
    { url: `${SITE_URL}/llms-full.txt` },
  ];
}
