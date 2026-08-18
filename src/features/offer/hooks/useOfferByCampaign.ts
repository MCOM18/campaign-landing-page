"use client";

import { useQuery } from "@tanstack/react-query";
import { getOfferByCampaign } from "../api/getOfferByCampaign";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { logger } from "@/lib/logger/logger";
import { queryClient } from "@/lib/react-query/queryClient";

export function useOfferByCampaign(campaignId: string, sCouponCode: string = "") {
  const { isAppReady } = useBootstrap();
  const isValidCampaignId = Boolean(campaignId) && campaignId !== "default";

  return useQuery({
    queryKey: ["offerByCampaign", campaignId, sCouponCode],
    queryFn: async ({ signal }) => {
      logger.info("[useOfferByCampaign] Fetching offer for campaignId:", campaignId);
      return await getOfferByCampaign(campaignId, sCouponCode, signal);
    },
    enabled: isAppReady && isValidCampaignId,
    retry: false,
  });
}

export async function fetchOfferByCampaignCached(campaignId: string, sCouponCode: string = "") {
  return queryClient.fetchQuery({
    queryKey: ["offerByCampaign", campaignId, sCouponCode],
    queryFn: async ({ signal }) => {
      logger.info("[fetchOfferByCampaignCached] Fetching offer for campaignId:", campaignId);
      return await getOfferByCampaign(campaignId, sCouponCode, signal);
    },
    staleTime: 5 * 60 * 1000,
  });
}