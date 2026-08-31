import { ApiEndpoint } from "@/enums/api.enum";
import { appConfig } from "@/lib/config/app.config";
import { useAuthStore } from "@/store/useAuthStore";
import { logger } from "@lib/logger/logger";
import { apiClient } from "@/lib/api/client";
import { LoginIdentifierType } from "@/enums/ui.enum";
import { getUserGeoLocation } from "@/utils/userUtil";
import type { AnalyticsEvent } from '../model/common.types';
import { EVENT_NAMES } from '../constants/analytics.constants';
import { getSourceLink } from '../utils/getSourceLink';
import { env } from "@/lib/config/env";

class BackendClient {
  private isEnabled = true;

  initialize(): void {
    logger.info("Backend Analytics Client initialized");
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /** 
   * Reads the device ID from localStorage.
   * Priority: browser_uid (set by native/external) → ott_device_id (auto-generated uuid by analytics)
   */
  private getDeviceId(): string {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return '';
    return (
      localStorage.getItem('browser_uid') ||
      localStorage.getItem('ott_device_id') ||
      ''
    );
  }

  private postEvent(endpointPath: string, payload: Record<string, unknown>, eventName: string): void {
    const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL || "";
    if (!analyticsUrl) return;

    const storeState = useAuthStore.getState();
    const sessionId = storeState.token || "";

    const baseUrl = analyticsUrl.endsWith('/') ? analyticsUrl.slice(0, -1) : analyticsUrl;
    const endpoint = `${baseUrl}${endpointPath}`;

    apiClient.post<unknown>(
      endpoint,
      payload,
      {
        encrypt: true,
        headers: {
          "Content-Type": "application/json",
          ...(sessionId ? { sessionid: sessionId } : {})
        }
      }
    ).catch((err) => {
      logger.error(`[Backend Analytics] Failed to send ${eventName} event: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  trackEvent(event: AnalyticsEvent): void {
    if (typeof window === 'undefined' || !this.isEnabled) return;

    if (event.name === 'login' || event.name === 'login_success') {
      logger.info(`[Backend Analytics] Ignored deprecated event ${event.name}`);
      return;
    }

    try {
      const storeState = useAuthStore.getState();
      const sessionId = storeState.token || "";
      const userId = storeState.user?.id || "";
      const geoData = getUserGeoLocation();

      // Case 1: campaign_landing_impression
      if (event.name === EVENT_NAMES.CAMPAIGN_LANDING_IMPRESSION) {
        const payload = {
          ...(event.properties || {}),
          appVersion: env.appVersion,
          device_id: this.getDeviceId(),
        } as Record<string, unknown>;
        this.postEvent(ApiEndpoint.CAMPAIGN_IMPRESSION, payload, event.name);
        return;
      }

      // Case 2: login_started
      if (event.name === EVENT_NAMES.LOGIN_STARTED) {
        const properties = event.properties || {};
        const eventSessionId = properties.session_id || sessionId;
        const eventUserId = properties.user_id || userId;
        const sourceLink = getSourceLink(properties.source_link);

        const payloadObject = {
          payload: {
            method: properties.method,
            ...(properties.method === LoginIdentifierType.PHONE && properties.value ? { phone_number: properties.value } : {}),
            ...(properties.method === LoginIdentifierType.EMAIL && properties.value ? { email: properties.value } : {}),
            lat: geoData?.lat || null,
            lng: geoData?.lng || null,
            city: geoData?.city || null,
            country: geoData?.country_code || null,
            source_link: sourceLink,
            user_id: eventUserId,
            session_id: eventSessionId,
            timestamp: Date.now(),
            appVersion: env.appVersion,
            device_id: this.getDeviceId(),
          }
        };
        this.postEvent(ApiEndpoint.LOGIN_STARTED_EVENT, payloadObject, event.name);
        return;
      }

      // Case 3: login_completed
      if (event.name === EVENT_NAMES.LOGIN_COMPLETED) {
        const properties = event.properties || {};
        const eventSessionId = properties.session_id || sessionId;
        const eventUserId = properties.user_id || userId;
        const sourceLink = getSourceLink(properties.source_link);

        const payloadObject = {
          payload: {
            method: properties.method,
            ...(properties.method === LoginIdentifierType.PHONE && properties.value ? {
              phone_number: properties.phoneOnly || "",
              phone_code: properties.phoneCode || ""
            } : {}),
            ...(properties.method === LoginIdentifierType.EMAIL && properties.value ? { email: properties.value } : {}),
            ...(properties.otp ? { otp: properties.otp } : {}),
            lat: geoData?.lat || null,
            lng: geoData?.lng || null,
            city: geoData?.city || null,
            country: geoData?.country_code || null,
            source_link: sourceLink,
            user_id: eventUserId,
            session_id: eventSessionId,
            timestamp: Date.now(),
            appVersion: env.appVersion,
            device_id: this.getDeviceId(),
          }
        };
        this.postEvent(ApiEndpoint.LOGIN_COMPLETED_EVENT, payloadObject, event.name);
        return;
      }

      // Case 4: Generic/Custom events
      const payloadObject = {
        event: event.name,
        properties: {
          ...event.properties,
          timestamp: new Date().toISOString(),
          appVersion: env.appVersion,
          device_id: this.getDeviceId(),
        },
      };
      this.postEvent(`/v1/jojoevents/${event.name}`, payloadObject, event.name);

    } catch (err) {
      logger.error(`[Backend Analytics] Error sending event: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

export const backendClient = new BackendClient();
