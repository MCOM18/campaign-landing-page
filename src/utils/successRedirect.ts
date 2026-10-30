import { analyticsService } from "@/shared/analytics";

/**
 * "Explore Now" on the success screen: return to the campaign redirect URL
 * (jojoapp.in only), otherwise send the user to the app install page.
 */
export function redirectAfterPurchaseSuccess() {
  const storedRedirectUrl = localStorage.getItem("campaign_redirect_url");

  const isCampaignUrl = storedRedirectUrl && (() => {
    try {
      // Exact domain or a real subdomain: a bare suffix check would also accept "evil-jojoapp.in".
      const { protocol, hostname } = new URL(storedRedirectUrl);
      return (protocol === "https:" || protocol === "http:") &&
        (hostname === "jojoapp.in" || hostname.endsWith(".jojoapp.in"));
    } catch { return false; }
  })();

  if (isCampaignUrl) {
    localStorage.removeItem("campaign_redirect_url");

    const campaignDataRaw = localStorage.getItem("campaign_decoded_data");
    if (campaignDataRaw) {
      try {
        const campaignData = JSON.parse(campaignDataRaw);
        analyticsService.track("campaign_purchase_success", campaignData);
        localStorage.removeItem("campaign_decoded_data");
      } catch (e) { }
    }

    window.location.href = storedRedirectUrl as string;
  } else {
    localStorage.removeItem("campaign_redirect_url");
    localStorage.removeItem("campaign_decoded_data");
    window.location.href = "https://jojoapp.in/appInstall";
  }
}
