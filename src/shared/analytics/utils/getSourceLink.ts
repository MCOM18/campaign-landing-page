/**
 * Helper to retrieve the source link URL from properties or localStorage.
 * Handles both plain URL strings and JSON strings correctly.
 */
export function getSourceLink(overrideValue?: string): string {
  if (typeof window === 'undefined') return overrideValue || "";

  let sourceLink = overrideValue || "";
  if (!sourceLink) {
    try {
      const rawCampaign = localStorage.getItem("source_link");
      if (rawCampaign) {
        if (rawCampaign.startsWith("http")) {
          sourceLink = rawCampaign;
        } else {
          const parsed = JSON.parse(rawCampaign);
          sourceLink = parsed.source_link || parsed.link || parsed.redirectUrl || rawCampaign;
        }
      }
    } catch {
      sourceLink = localStorage.getItem("source_link") || "";
    }
  }
  return sourceLink;
}

/**
 * Extract all query/UTM parameters from source_link (or localStorage).
 * E.g., for "https://subscription.jojoapp.in/?utm_source=qr&utm_medium=offline&utm_campaign=coupon_campaign&utm_id=1&utm_term=paid&utm_content=Rajkot_Movie_Theater"
 * it returns { utm_source: "qr", utm_medium: "offline", utm_campaign: "coupon_campaign", utm_id: "1", utm_term: "paid", utm_content: "Rajkot_Movie_Theater" }
 */
export function parseSourceLinkParams(overrideSourceLink?: string): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const sourceLink = getSourceLink(overrideSourceLink);
  const params: Record<string, string> = {};

  if (sourceLink) {
    try {
      const url = new URL(sourceLink);
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });
    } catch {
      try {
        const url = new URL(sourceLink, '');
        url.searchParams.forEach((value, key) => {
          params[key] = value;
        });
      } catch {
        // ignore invalid URL format
      }
    }
  }

  // Also check and merge from campaign_decoded_data if available in localStorage
  try {
    const rawDecoded = localStorage.getItem("campaign_decoded_data");
    if (rawDecoded) {
      const parsed = JSON.parse(rawDecoded);
      if (parsed && typeof parsed === 'object') {
        const utmKeys = [
          'utm_source',
          'utm_medium',
          'utm_campaign',
          'utm_id',
          'utm_term',
          'utm_content',
          'ad_id',
          'ad_type',
          'ad_placement',
          'cta_type',
          'target_screen'
        ];
        utmKeys.forEach((key) => {
          if (parsed[key] && !params[key]) {
            params[key] = String(parsed[key]);
          }
        });
      }
    }
  } catch {
    // ignore parse errors
  }

  return params;
}
