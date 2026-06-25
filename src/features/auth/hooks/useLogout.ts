/**
 * Logout Hook
 * 
 * Handles complete logout flow:
 * - Clear auth store
 * - Clear profile store
 * - Clear React Query cache
 * - Disconnect socket
 * - Clear localStorage
 * - Redirect to login
 */

"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@store/useAuthStore";
import { logger } from "@/lib/logger/logger";
import { ROUTES } from "@/lib/constants/routes";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore(state => state.clearAuth);

  const logout = () => {
    logger.info('[Logout] Starting logout process...');

    try {
      // 1. Clear auth store (also clears localStorage tokens)
      clearAuth();
      logger.info('[Logout] ✅ Auth store cleared');

      // 4. Clear React Query cache
      queryClient.clear();
      logger.info('[Logout] ✅ React Query cache cleared');

      // 5. Clear any remaining localStorage items (optional - be selective)
      // Note: We keep geo cache and country cache for better UX
      try {
        // Clear only auth-related items
        localStorage.removeItem('apple_login_in_progress');
        // Add other auth-specific keys if needed
      } catch (e) {
        logger.warn('[Logout] Could not clear some localStorage items', { error: e });
      }

      logger.info('[Logout] ✅ Logout complete, redirecting to login');

      // 6. Redirect to login
      router.push(ROUTES.LOGIN);
    } catch (error) {
      logger.error('[Logout] Error during logout', { error });
      // Still redirect to login even if there's an error
      router.push(ROUTES.LOGIN);
    }
  };

  return { logout };
}
