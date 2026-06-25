/**
 * Verify Special User API
 * Returns raw API response
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { VerifySpecialUserRequest, ApiResponse } from "../model/types";

export async function verifySpecialUser(
  request: VerifySpecialUserRequest,
  sessionId?: string
): Promise<ApiResponse<any>> {
  return apiClient.post<any>(
    ApiEndpoint.VERIFY_SPECIAL_USER,
    {
      phone_code: request.phone_code,
      phone: request.phone,
      is_register: request.is_register,
      source: request.source,
    },
    { 
      encrypt: true,
      headers: sessionId ? { sessionid: sessionId } : {}
    }
  );
}
