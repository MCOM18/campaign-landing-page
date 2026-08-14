"use client";

import React, { useEffect, useState } from "react";
import { SuccessScreen } from "@/components/SuccessScreen";
import { analyticsService } from "@/shared/analytics";

export default function SuccessPage() {
  const [isTrial, setIsTrial] = useState(false);

  useEffect(() => {
    try {
      const selectedPlanRaw = localStorage.getItem("selectedPlan");
      if (selectedPlanRaw) {
        const plan = JSON.parse(selectedPlanRaw);
        if (plan?.offerId) {
          setIsTrial(true);
        }
      }
    } catch (e) {}
  }, []);

  const handleReset = () => {
    const storedRedirectUrl = localStorage.getItem("campaign_redirect_url");

    const isCampaignUrl = storedRedirectUrl && (() => {
      try {
        return new URL(storedRedirectUrl).hostname.endsWith("jojoapp.in");
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
        } catch (e) {}
      }

      window.location.href = storedRedirectUrl as string;
    } else {
      localStorage.removeItem("campaign_redirect_url");
      localStorage.removeItem("campaign_decoded_data");
      window.location.href = "https://jojoapp.in";
    }
  };

  return (
    <div style={{ width: "100%", height: "100vh", backgroundColor: "#050505" }}>
      <SuccessScreen
        isTrial={isTrial}
        onReset={handleReset}
      />
    </div>
  );
}
