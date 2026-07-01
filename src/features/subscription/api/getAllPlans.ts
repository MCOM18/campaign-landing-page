/**
 * Get All Plans API
 * Returns raw API response containing all subscription plans
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { ApiResponse } from "@lib/types/api.types";
import { logger } from "@/lib/logger/logger";

export async function getAllPlans(
  request: any
): Promise<ApiResponse<any>> {
  logger.info('[All Plans API] Request:', request);

  try {
    const response = await apiClient.post<any>(
      ApiEndpoint.ALL_PLANS,
      request,
      { encrypt: true }
    );

    logger.info('[All Plans API] Response:', {
      metaData: response.metaData,
      data: response.data
    });

    return response;
  } catch (error) {
    logger.error('[All Plans API] Error:', error);
    throw error;
  }
}
