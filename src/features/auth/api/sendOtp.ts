/**
 * Send OTP API
 * Returns raw API response
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { SendOtpRequest, ApiResponse } from "../model/types";
import { logger } from "@/lib/logger/logger";
import { LoginIdentifierType } from "@/enums/ui.enum";

export async function sendOtp(
  request: SendOtpRequest,
  sessionId?: string
): Promise<ApiResponse<any>> {

  const body: any = {
    is_register: request.is_register,
    source: request.source,
    ...(request.country ? { country: request.country } : {}),
    ...(request.state ? { state: request.state } : {}),
    ...(request.city ? { city: request.city } : {}),
    ...(request.lat ? { lat: request.lat } : {}),
    ...(request.long ? { long: request.long } : {}),
  };

  if (request.source === LoginIdentifierType.PHONE) {
    body.phone = request.phone;
    body.phone_code = request.phone_code;
  } else {
    body.email = request.phone;
  }

  logger.info('[Send OTP API] Request body:', body);

  return apiClient.post<any>(
    ApiEndpoint.SEND_OTP,
    body,
    {
      encrypt: true,
      headers: sessionId ? { sessionid: sessionId } : {}
    }
  );
}
