"use client";

import { useQuery } from "@tanstack/react-query";
import { getOfferByCampaign } from "../api/getOfferByCampaign";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { logger } from "@/lib/logger/logger";

export function useOfferByCampaign(campaignId: string, sCouponCode: string = "") {
  const { isAppReady } = useBootstrap();
  const isValidCampaignId = Boolean(campaignId) && campaignId !== "default";

  return useQuery({
    queryKey: ["offerByCampaign", campaignId, sCouponCode],
    queryFn: async () => {
      logger.info("[useOfferByCampaign] Fetching offer for campaignId:", campaignId);
      return await getOfferByCampaign(campaignId, sCouponCode);
    },
    enabled: isAppReady && isValidCampaignId,
  });
}