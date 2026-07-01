import { ApiEndpoint } from "@/enums/api.enum";
import { appConfig, getAppConfig, isConfigLoaded } from "@/lib/config/app.config";
import { useAuthStore } from "@/store/useAuthStore";
import { logger } from "@lib/logger/logger";
import { apiClient } from "@/lib/api/client";
import { LoginIdentifierType } from "@/enums/ui.enum";
import { getUserGeoLocation } from "@/utils/userUtil";

export type AnalyticsEvent =
  | "login"
  | "logout"
  | "page_view";

export function trackEvent(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  if (!appConfig.flags.enableAnalytics) return;

  logger.info(`[Analytics] ${event}`, properties);

  if (isConfigLoaded()) {
    try {
      const config = getAppConfig();
      const analyticsUrl = config.analyticsUrl;

      if (analyticsUrl) {
        const payloadObject = {
          event,
          properties: {
            ...properties,
            self_link: appConfig.ANALYTICS_SELF_LINK,
            timestamp: new Date().toISOString(),
          },
        };

        const storeState = useAuthStore.getState();
        const sessionId = storeState.token || "";

        apiClient.post<any>(
          analyticsUrl,
          payloadObject,
          {
            encrypt: true,
            headers: {
              "Content-Type": "application/json",
              ...(sessionId ? { sessionid: sessionId } : {})
            }
          }
        ).catch((err) => {
          logger.error(`[Analytics] Failed to send event to backend: ${err instanceof Error ? err.message : String(err)}`);
        });
      }
    } catch (err) {
      logger.error(`[Analytics] Error resolving config for tracking: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

export function trackLoginStarted(
  method: LoginIdentifierType.PHONE | LoginIdentifierType.EMAIL,
  value?: string
): void {
  logger.info(`[Analytics] login_started`, { method, value });

  try {
    const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL;

    if (analyticsUrl) {
      const storeState = useAuthStore.getState();
      const user = storeState.user;
      const sessionId = storeState.token || "";
      const userId = user?.id || "";
      const geoData = getUserGeoLocation();

      const baseUrl = analyticsUrl.endsWith('/') ? analyticsUrl.slice(0, -1) : analyticsUrl;
      const endpoint = `${baseUrl}${ApiEndpoint.LOGIN_STARTED_EVENT}`;

      const payloadObject = {
        payload: {
          method: method,
          ...(method === LoginIdentifierType.PHONE && value ? { phone_number: value } : {}),
          ...(method === LoginIdentifierType.EMAIL && value ? { email: value } : {}),
          lat: geoData?.lat || null,
          Long: geoData?.Long || null,
          city: geoData?.city || null,
          country: geoData?.country_code || null,
        },
        timestamp: Date.now(),
        sessionid: sessionId,
        user_id: userId,
        profile_id: "",
      };

      apiClient.post<any>(
        endpoint,
        payloadObject,
        {
          encrypt: true,
          headers: {
            "Content-Type": "application/json",
            ...(sessionId ? { sessionid: sessionId } : {})
          }
        }
      ).catch((err) => {
        logger.error(`[Analytics] Failed to send login_started event to backend: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  } catch (err) {
    logger.error(`[Analytics] Error in trackLoginStarted: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function trackLoginCompleted(
  method: LoginIdentifierType.PHONE | LoginIdentifierType.EMAIL,
  value?: string,
  otp?: string,
  phoneCode?: string,
  phoneOnly?: string
): Promise<any> {
  logger.info(`[Analytics] login_completed`, { method, value, otp, phoneCode, phoneOnly });

  try {
    const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL;

    if (analyticsUrl) {
      const storeState = useAuthStore.getState();
      const user = storeState.user;
      const sessionId = storeState.token || "";
      const userId = user?.id || "";
      const geoData = getUserGeoLocation();

      const baseUrl = analyticsUrl.endsWith('/') ? analyticsUrl.slice(0, -1) : analyticsUrl;
      const endpoint = `${baseUrl}${ApiEndpoint.LOGIN_COMPLETED_EVENT}`;

      const payloadObject = {
        payload: {
          method: method,
          ...(method === LoginIdentifierType.PHONE && value ? {
            phone_number: phoneOnly || "",
            phone_code: phoneCode || ""
          } : {}),
          ...(method === LoginIdentifierType.EMAIL && value ? { email: value } : {}),
          ...(otp ? { otp: otp } : {}),
          lat: geoData?.lat || null,
          Long: geoData?.Long || null,
          city: geoData?.city || null,
          country: geoData?.country_code || null,
        },
        timestamp: Date.now(),
        sessionid: sessionId,
        user_id: userId,
        profile_id: "",
      };

      return apiClient.post<any>(
        endpoint,
        payloadObject,
        {
          encrypt: true,
          headers: {
            "Content-Type": "application/json",
            ...(sessionId ? { sessionid: sessionId } : {})
          }
        }
      ).catch((err) => {
        logger.error(`[Analytics] Failed to send login_completed event to backend: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  } catch (err) {
    logger.error(`[Analytics] Error in trackLoginCompleted: ${err instanceof Error ? err.message : String(err)}`);
  }
  return Promise.resolve();
}

export function trackCampaignLandingImpression(payloadData: any): void {
  logger.info(`[Analytics] campaign_landing_impression`, payloadData);

  try {
    const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL;

    if (analyticsUrl) {
      const storeState = useAuthStore.getState();
      const sessionId = storeState.token || "";

      const baseUrl = analyticsUrl.endsWith('/') ? analyticsUrl.slice(0, -1) : analyticsUrl;
      const endpoint = `${baseUrl}${ApiEndpoint.CAMPAIGN_IMPRESSION}`;
      logger.info(`[Analytics] Making API call to: ${endpoint}`);

      apiClient.post<any>(
        endpoint,
        payloadData,
        {
          encrypt: true,
          headers: {
            "Content-Type": "application/json",
            ...(sessionId ? { sessionid: sessionId } : {})
          }
        }
      ).catch((err) => {
        logger.error(`[Analytics] Failed to send campaign_landing_impression event to backend: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  } catch (err) {
    logger.error(`[Analytics] Error in trackCampaignLandingImpression: ${err instanceof Error ? err.message : String(err)}`);
  }
}