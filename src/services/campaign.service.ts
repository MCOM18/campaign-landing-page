import { fetchConfig, RuntimeConfig } from "@/lib/config/app.config";
import { parseCampaignObject } from "@/lib/campaign/campaign.parser";
import { resolveCampaignPath, ResolvedCampaignItem } from "@/lib/campaign/campaign.resolver";

/**
 * Fetches the runtime configuration.
 */
export async function getCampaignConfig(): Promise<RuntimeConfig> {
  return await fetchConfig();
}

/**
 * Retrieves the parsed campaign object from the app config API response.
 */
export async function getCampaignObject(): Promise<Record<string, unknown>> {
  const config = await fetchConfig();

  if (config.campaign && Object.keys(config.campaign).length > 0) {
    return config.campaign;
  }

  const campaignString = config.devices?.platform?.misc?.[0]?.["campaign-object"];
  return parseCampaignObject(campaignString);
}

/**
 * Resolves a requested URL path against the API's dynamic content collections.
 */
export async function getCampaignItem(
  requestedPath: string
): Promise<ResolvedCampaignItem | null> {
  const campaign = await getCampaignObject();
  return resolveCampaignPath(campaign, requestedPath);
}

/**
 * Extracts all canonical paths across all campaign collections (movies, shows, etc.).
 * Used by generateStaticParams for pre-rendering static routes.
 */
export async function getAllCampaignPaths(): Promise<string[]> {
  const campaign = await getCampaignObject();
  const paths: string[] = [];

  for (const [, value] of Object.entries(campaign)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item?.path && typeof item.path === "string") {
          paths.push(item.path);
        }
      }
    }
  }

  return paths;
}
