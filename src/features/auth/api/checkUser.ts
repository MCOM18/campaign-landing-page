import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { CheckUserRequest, ApiResponse } from "../model/types";
import { logger } from "@/lib/logger/logger";
import { LoginIdentifierType } from "@/enums/ui.enum";

export async function checkUser(
  request: CheckUserRequest,
  sessionId?: string
): Promise<ApiResponse<any>> {
  const body: any = {
    source: request.source,
  };

  if (request.source === LoginIdentifierType.PHONE) {
    body.phone = request.phone;
    body.phone_code = request.phone_code;
  } else {
    body.email = request.phone;
  }

  logger.info('[Check User API] Request body:', body);

  try {
    const response = await apiClient.post<any>(
      ApiEndpoint.CHECK_USER,
      body,
      {
        encrypt: true,
        headers: sessionId ? { sessionid: sessionId } : {}
      }
    );

    // Log decrypted response
    logger.info('[Check User API] Decrypted response:', {
      metaData: response.metaData,
      data: response.data
    });

    return response;
  } catch (error) {
    logger.error('[Check User API] Error:', error);
    throw error;
  }
}
