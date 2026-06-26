/**
 * Get Special Offer Plan API
 * Returns raw API response
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { ApiResponse } from "@lib/types/api.types";
import type { SpecialOfferPlanRequest } from "../model/types";
import { logger } from "@/lib/logger/logger";

export async function getSpecialOfferPlan(
  request: SpecialOfferPlanRequest
): Promise<ApiResponse<any>> {
  logger.info('[Special Offer Plan API] Request:', request);

  try {
    const response = await apiClient.post<any>(
      ApiEndpoint.SPECIAL_OFFER_PLAN,
      request,
      { encrypt: true }
    );

    logger.info('[Special Offer Plan API] Response:', {
      metaData: response.metaData,
      data: response.data
    });

    return response;
  } catch (error) {
    logger.error('[Special Offer Plan API] Error:', error);
    throw error;
  }
}
