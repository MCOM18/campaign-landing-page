"use client";

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@store/useAuthStore';
import { logger } from '@lib/logger/logger';
import { mapSubscriptionAllPlans } from '@/model/mapper';
import { GetAllPlansPayload, getAllSubscriptionPlans } from '@/lib/api/getAllPlans';

export function useSubscriptionAllPlans(
  payload: GetAllPlansPayload,
  enabled = true
) {
  const storeToken = useAuthStore((state) => state.token);
  const sessionId =
    storeToken ||
    (typeof window !== "undefined"
      ? localStorage.getItem("session_id") || localStorage.getItem("auth_token")
      : null);

  return useQuery({
    queryKey: ['subscription-all-plans', payload.country, payload.deviceTypeId, payload.languageId, sessionId],
    queryFn: async () => {
      logger.info('[useSubscriptionAllPlans] Fetching subscription plans', { payload, sessionId });
      const response = await getAllSubscriptionPlans(payload, sessionId ?? undefined);
      return mapSubscriptionAllPlans(response);
    },
    enabled: enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
