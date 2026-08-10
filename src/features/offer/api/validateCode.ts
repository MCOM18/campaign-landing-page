/**
 * Validate Coupon Code API
 * Calls POST /user/offer/validate-code with encrypted payload envelope ({ data: "<encryptedHex>" })
 */

import { apiClient } from "@/lib/api/client";
import { ApiEndpoint } from "@/enums/api.enum";
import { getUserAuthData, getUserGeoLocation } from "@/utils/userUtil";
import { logger } from "@/lib/logger/logger";
import type { ApiResponse } from "@/lib/types/api.types";

export interface ValidateCodePayload {
  couponCode: string;
  campaignId?: string;
}

export async function validateCode(couponCode: string, campaignId?: string): Promise<ApiResponse<any>> {
  const cleanCode = (couponCode || "").trim();
  if (!cleanCode) {
    throw new Error("Coupon code is required");
  }

  const endpoint = ApiEndpoint.VALIDATE_CODE;
  const authData = getUserAuthData();
  const geoData = getUserGeoLocation();

  const headers: Record<string, string> = {
    sessionid: authData.session_id || "",
    country: geoData.country_code || "IN",
  };

  const payload: ValidateCodePayload = {
    couponCode: cleanCode,
    ...(campaignId ? { campaignId } : {}),
  };

  logger.info("[Validate Code API] Requesting POST:", { endpoint, payload, headers });

  try {
    // Pass encrypt: true option so apiClient encrypts the entire payload into { data: "<encryptedHex>" }
    const response = await apiClient.post<any>(endpoint, payload, { headers, encrypt: true });

    logger.info("[Validate Code API] Response:", {
      metaData: response.metaData,
      data: response.data,
    });

    return response;
  } catch (error) {
    logger.error("[Validate Code API] Error:", error);
    throw error;
  }
}
