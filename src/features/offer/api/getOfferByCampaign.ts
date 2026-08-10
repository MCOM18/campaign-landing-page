/**
 * Get Offer By Campaign API
 * Returns raw API response for offer details by campaign ID
 */

import { apiClient } from "@/lib/api/client";
import { ApiEndpoint } from "@/enums/api.enum";
import { getUserAuthData, getUserGeoLocation } from "@/utils/userUtil";
import { logger } from "@/lib/logger/logger";
import type { ApiResponse } from "@/lib/types/api.types";

export async function getOfferByCampaign(campaignId: string, sCouponCode: string = ""): Promise<ApiResponse<any>> {
  if (!campaignId) {
    throw new Error("Campaign ID is required");
  }

  const endpoint = ApiEndpoint.GET_OFFER_BY_CAMPAIGN.replace(":campaignId", campaignId);

  const authData = getUserAuthData();
  const geoData = getUserGeoLocation();

  const headers: Record<string, string> = {
    sessionid: authData.session_id || "",
    country: geoData.country_code || "IN",
  };

  const payload = {
    sCouponCode: sCouponCode || "",
    sCampaignId: campaignId,
  };

  logger.info("[Get Offer By Campaign API] Requesting:", { endpoint, headers, payload });

  try {
    const response = await apiClient.post<any>(endpoint, payload, { headers, encrypt: true });

    logger.info("[Get Offer By Campaign API] Response:", {
      metaData: response.metaData,
      data: response.data,
    });

    return response;
  } catch (error) {
    logger.error("[Get Offer By Campaign API] Error:", error);
    throw error;
  }
}
