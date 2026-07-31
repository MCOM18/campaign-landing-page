import { useQuery } from "@tanstack/react-query";
import { appConfig } from "@/lib/config/app.config";
import { useAuthStore } from "@store/useAuthStore";
import { verifySubscription } from "@/lib/api/verify-subscription";

export function useVerifySubscription(countryCode: string, sessionId?: string | null, isAppReady?: boolean) {
    const user = useAuthStore((state) => state.user);
    const isGuest = user?.isGuest ?? false;

    return useQuery({
        queryKey: ["verify-subscription", sessionId, countryCode, user?.id],
        queryFn: async ({ signal }) => verifySubscription(countryCode, sessionId ?? undefined, signal),
        enabled: !!sessionId && !!user && !isGuest && !!countryCode && (isAppReady === undefined || !!isAppReady),
        staleTime: 5 * 60 * 1000,
        retry: false,
    });
}
