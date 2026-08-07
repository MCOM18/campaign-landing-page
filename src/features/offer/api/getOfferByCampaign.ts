/**
 * Get Offer By Campaign API
 * Returns raw API response for offer details by campaign ID
 */

import { apiClient } from "@/lib/api/client";
import { ApiEndpoint } from "@/enums/api.enum";
import { DEFAULT_HEADER_VALUES } from "@/lib/constants/headers";
import { getBrowserUID } from "@/lib/utils/deviceId";
import { getUserAuthData, getUserGeoLocation } from "@/utils/userUtil";
import { logger } from "@/lib/logger/logger";
import type { ApiResponse } from "@/lib/types/api.types";

export async function getOfferByCampaign(campaignId: string): Promise<ApiResponse<any>> {
  if (!campaignId) {
    throw new Error("Campaign ID is required");
  }

  const endpoint = ApiEndpoint.GET_OFFER_BY_CAMPAIGN.replace(":campaignId", campaignId);

  const authData = getUserAuthData();
  const geoData = getUserGeoLocation();

  const headers: Record<string, string> = {
    deviceid: getBrowserUID(),
    devicetypecode: DEFAULT_HEADER_VALUES.DEVICE_TYPE_CODE,
    sessionid: authData.session_id || "",
    language: DEFAULT_HEADER_VALUES.LANGUAGE,
    country: geoData.country_code || "IN",
  };

  logger.info("[Get Offer By Campaign API] Requesting:", { endpoint, headers, campaignId });

  try {
    const response = await apiClient.get<any>(endpoint, { headers });

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
