import type { CampaignItem, ResolvedCampaignItem } from "@/types/campaign";

export type { ResolvedCampaignItem };

/**
 * Normalizes a URL path by stripping leading and trailing slashes.
 */
function normalizePath(path: string): string {
  return path.replace(/^\/+|\/+$/g, "");
}

/**
 * Dynamically resolves any content path against the parsed campaign object.
 * Searches every array collection (movies, shows, web-series, sports, etc.) without
 * hardcoding category names.
 */
export function resolveCampaignPath(
  campaign: Record<string, unknown>,
  requestedPath: string
): ResolvedCampaignItem | null {
  const normalizedTarget = normalizePath(requestedPath);
  if (!normalizedTarget) {
    return null;
  }

  for (const [type, value] of Object.entries(campaign)) {
    if (!Array.isArray(value)) {
      continue;
    }

    const item = value.find(
      (entry): entry is CampaignItem =>
        typeof entry === "object" &&
        entry !== null &&
        "path" in entry &&
        typeof (entry as { path?: unknown }).path === "string" &&
        normalizePath((entry as { path: string }).path) === normalizedTarget
    );

    if (item) {
      return {
        type,
        item,
      };
    }
  }

  return null;
}
