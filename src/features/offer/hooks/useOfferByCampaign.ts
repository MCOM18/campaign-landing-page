"use client";

import { useQuery } from "@tanstack/react-query";
import { getOfferByCampaign } from "../api/getOfferByCampaign";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { logger } from "@/lib/logger/logger";

export function useOfferByCampaign(campaignId: string) {
  const { isAppReady } = useBootstrap();

  return useQuery({
    queryKey: ["offerByCampaign", campaignId],
    queryFn: async () => {
      logger.info("[useOfferByCampaign] Fetching offer for campaignId:", campaignId);
      return await getOfferByCampaign(campaignId);
    },
    enabled: isAppReady && Boolean(campaignId),
  });
}
