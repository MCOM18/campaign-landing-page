import { QueryClient } from "@tanstack/react-query";
import { handleError } from "@lib/error/handler";
import { logger } from "@lib/logger/logger";

/**
 * TanStack Query Client Configuration
 * 
 * Global settings for data fetching and caching
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
      onError: (error) => {
        // All errors go through centralized error handler
        const message = handleError(error);
        logger.error("[Mutation Error]", { message });
      },
    },
  },
});
