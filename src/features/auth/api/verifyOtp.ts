/**
 * Verify OTP API
 * Returns raw API response
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { VerifyOtpRequest, ApiResponse } from "../model/types";
import { LoginIdentifierType } from "@/enums/ui.enum";
import { logger } from "@/lib/logger/logger";

export async function verifyOtp(
  request: VerifyOtpRequest,
  sessionId?: string
): Promise<ApiResponse<any>> {
  // Build request body based on source
  const body: any = {
    otp: request.otp,
    is_register: request.is_register,
    source: request.source,
    domain: typeof window !== "undefined" ? window.location.hostname : "jojoapp.in"
  };

  if (request.source === LoginIdentifierType.PHONE) {
    // For phone: use phone and phone_code fields
    body.phone = request.phone;
    body.phone_code = request.phone_code;
  } else {
    // For email: use email field instead of phone
    body.email = request.phone; // API expects 'email' field for email source
  }

  if (request.country !== undefined && request.country !== null) body.country = request.country;
  if (request.state !== undefined && request.state !== null) body.state = request.state;
  if (request.city !== undefined && request.city !== null) body.city = request.city;
  if (request.lat !== undefined && request.lat !== null) body.lat = request.lat;
  if (request.lng !== undefined && request.lng !== null) body.lng = request.lng;

  logger.info('[Verify OTP API] Request body:', body);

  try {
    const response = await apiClient.post<any>(
      ApiEndpoint.VERIFY_OTP,
      body,
      {
        encrypt: true,
        headers: sessionId ? { sessionid: sessionId } : {}
      }
    );

    // Log decrypted response
    logger.info('[Verify OTP API] Decrypted response:', {
      metaData: response.metaData,
      data: response.data
    });

    return response;
  } catch (error) {
    logger.error('[Verify OTP API] Error:', error);
    throw error;
  }
}
