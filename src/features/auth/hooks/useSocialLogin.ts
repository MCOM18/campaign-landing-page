"use client";

import { useMutation } from "@tanstack/react-query";
import { socialLoginService } from "../services/auth.service";
import { useAuthStore } from "@store/useAuthStore";
import { handleError } from "@lib/error/handler";
import { logger } from "@/lib/logger/logger";
import type { SocialLoginRequest } from "../model/types";

export function useSocialLogin() {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (request: SocialLoginRequest) => {
      const sessionId = useAuthStore.getState().token ?? undefined;
      return socialLoginService(request, sessionId);
    },
    onSuccess: (data) => {
      setAuth(
        {
          id: data.user_id,
          phone: data.phone || '',
          email: data.email,
          isGuest: false,
          createdAt: new Date().toISOString(),
        },
        data.session_id,
        "" // no refresh token from this endpoint
      );

      logger.info("[Social Login Success]", {
        userId: data.user_id,
        email: data.email,
        isNewUser: data.isNewUser
      });
    },
    onError: (error) => {
      const message = handleError(error);
      logger.error("[Social Login Error]", { message });
    },
  });
}
