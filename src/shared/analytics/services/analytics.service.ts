import { appConfig } from '@/lib/config/app.config';
import { backendClient } from '../clients/backend.client';
import { cleverTapClient } from '../clients/clevertap.client';
import { firebaseClient } from '../clients/firebase.client';
import { facebookPixelClient } from '../clients/facebook.client';
import { isProduction } from '../constants/analytics.constants';
import type { AnalyticsEvent } from '../model/common.types';
import type { EventContext } from '../model/context.types';
import { AnalyticsProvider } from '../model/provider.types';
import { buildDevicePayload } from '../utils/buildDevicePayload';
import { buildUserPayload } from '../utils/buildUserPayload';
import { analyticsLogger } from '../utils/logger';
import { getSourceLink, parseSourceLinkParams } from '../utils/getSourceLink';

class AnalyticsService {
  private isInitialized = false;
  private isEnabled = true;

  async initialize(config: {
    clevertap?: {
      accountId: string;
      region: string;
    };
    firebase?: {
      apiKey: string;
      authDomain: string;
      projectId: string;
      storageBucket: string;
      messagingSenderId: string;
      appId: string;
      measurementId: string;
    };
  }): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (config.clevertap && process.env.NEXT_PUBLIC_ENABLE_CLEVERTAP === 'true') {
        await cleverTapClient.initialize(
          config.clevertap.accountId,
          config.clevertap.region
        );
      }
      if (config.firebase && process.env.NEXT_PUBLIC_ENABLE_FIREBASE === 'true') {
        await firebaseClient.initialize(config.firebase);
      }
      if (process.env.NEXT_PUBLIC_ENABLE_BACKEND_ANALYTICS === 'true') {
        backendClient.initialize();
      }
      this.isInitialized = true;
      analyticsLogger.info("AnalyticsService initialized successfully");
    } catch (error) {
      analyticsLogger.error('AnalyticsService init failed', error);
    }
  }

  track(event: AnalyticsEvent | string, properties?: Record<string, any>): void {
    if (!this.isEnabled) return;
    try {
      const sourceLink = getSourceLink(typeof event === 'object' ? event.properties?.source_link : properties?.source_link);
      const sourceParams = parseSourceLinkParams(sourceLink);

      const eventProps = typeof event === 'string' ? properties : event?.properties;
      const enrichedProperties = {
        ...(sourceLink ? { source_link: sourceLink } : {}),
        ...sourceParams,
        ...eventProps,
      };

      let enrichedEvent: AnalyticsEvent;
      if (typeof event === 'string') {
        enrichedEvent = {
          name: event,
          properties: enrichedProperties,
          context: this.buildContext(),
        };
      } else {
        enrichedEvent = {
          ...event,
          properties: enrichedProperties,
          context: this.buildContext(event.context),
        };
      }

      analyticsLogger.info(`[Analytics] ${enrichedEvent.name}`, {
        properties: enrichedEvent.properties,
        context: enrichedEvent.context
      });
      // Determine which providers to send to
      let providers = enrichedEvent.providers || [
        AnalyticsProvider.CLEVERTAP,
        AnalyticsProvider.FIREBASE,
        AnalyticsProvider.BACKEND,
        AnalyticsProvider.FACEBOOK_PIXEL,
      ];

      // Filter based on environment flags
      if (process.env.NEXT_PUBLIC_ENABLE_CLEVERTAP !== 'true') {
        providers = providers.filter(p => p !== AnalyticsProvider.CLEVERTAP);
      }
      if (process.env.NEXT_PUBLIC_ENABLE_FIREBASE !== 'true') {
        providers = providers.filter(p => p !== AnalyticsProvider.FIREBASE);
      }
      if (process.env.NEXT_PUBLIC_ENABLE_BACKEND_ANALYTICS !== 'true') {
        providers = providers.filter(p => p !== AnalyticsProvider.BACKEND);
      }
      // Facebook pixel is enabled unconditionally for now
      // if (process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_PIXEL !== 'true') {
      //   providers = providers.filter(p => p !== AnalyticsProvider.FACEBOOK_PIXEL);
      // }

      // Send to providers
      if (providers.includes(AnalyticsProvider.CLEVERTAP)) {
        cleverTapClient.trackEvent(enrichedEvent);
      }

      if (providers.includes(AnalyticsProvider.FIREBASE)) {
        firebaseClient.trackEvent(enrichedEvent);
      }

      if (providers.includes(AnalyticsProvider.BACKEND)) {
        backendClient.trackEvent(enrichedEvent);
      }

      if (providers.includes(AnalyticsProvider.FACEBOOK_PIXEL)) {
        facebookPixelClient.trackEvent(enrichedEvent);
      }
    } catch (error) {
      analyticsLogger.error('Analytics: Failed to track event', error);
    }
  }

  // ─── AUTH EVENTS ───
  // trackLoginSuccess(data: any): void {
  //   this.track((authEvents as any).loginSuccess(data));
  // }

  // trackLoginFailed(data: Parameters<typeof authEvents.loginFailed>[0]): void {
  //   this.track(authEvents.loginFailed(data));
  // }

  // trackOtpSent(data: Parameters<typeof authEvents.otpSent>[0]): void {
  //   this.track(authEvents.otpSent(data));
  // }

  // trackOtpVerified(data: Parameters<typeof authEvents.otpVerified>[0]): void {
  //   this.track(authEvents.otpVerified(data));
  // }

  // trackOtpFailed(data: Parameters<typeof authEvents.otpFailed>[0]): void {
  //   this.track(authEvents.otpFailed(data));
  // }

  // trackLogout(data?: Parameters<typeof authEvents.logout>[0]): void {
  //   this.track(authEvents.logout(data));
  // }

  // trackCampaignLandingImpression(data: Record<string, unknown>): void {
  //   this.track(EVENT_NAMES.CAMPAIGN_LANDING_IMPRESSION, data);
  // }

  // trackLoginStarted(method: string, value?: string): void {
  //   this.track(EVENT_NAMES.LOGIN_STARTED, { method, value });
  // }

  // trackLoginCompleted(data: Record<string, unknown>): void {
  //   this.track(EVENT_NAMES.LOGIN_COMPLETED, data);
  // }

  // trackPaymentSuccess(properties: Record<string, any>): void {
  //   this.track(EVENT_NAMES.PAYMENT_SUCCESS, properties);
  // }

  // trackPaymentFailure(properties: Record<string, any>): void {
  //   this.track(EVENT_NAMES.PAYMENT_FAILURE, properties);
  // }

  // ─── USER IDENTIFICATION ───
  identifyUser(userId: string, properties?: Record<string, any>): void {
    if (!this.isEnabled) return;
    if (process.env.NEXT_PUBLIC_ENABLE_FIREBASE === 'true') {
      firebaseClient.identifyUser(userId, properties);
    }
  }

  updateUserProperties(properties: Record<string, any>): void {
    if (!this.isEnabled) return;
    if (process.env.NEXT_PUBLIC_ENABLE_FIREBASE === 'true') {
      const user = buildUserPayload();
      if (user?.user_id) {
        firebaseClient.identifyUser(user.user_id, properties);
      } else {
        firebaseClient.identifyUser('', properties);
      }
    }
  }

  resetUser(): void {
    if (!this.isEnabled) return;
    if (process.env.NEXT_PUBLIC_ENABLE_FIREBASE === 'true') {
      firebaseClient.resetUser();
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (process.env.NEXT_PUBLIC_ENABLE_FIREBASE === 'true') {
      firebaseClient.setEnabled(enabled);
    }
  }

  getEnabled(): boolean {
    return this.isEnabled;
  }

  private buildContext(additionalContext?: Partial<EventContext>): EventContext {
    // Read decoded campaign data from localStorage (set by page.tsx when URL data= param is decoded)
    let campaign: Record<string, any> | undefined;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('campaign_decoded_data');
        if (raw) campaign = JSON.parse(raw);
      } catch {
        // ignore parse errors
      }
    }

    return {
      device: buildDevicePayload(),
      user: buildUserPayload(),
      timestamp: new Date().toISOString(),
      suffix: appConfig.ANALYTICS_SUFFIX_TEXT,
      environment: isProduction() ? 'production' : 'development',
      self_link: appConfig.ANALYTICS_SELF_LINK,
      ...(campaign ? { campaign } : {}),
      ...additionalContext
    };
  }
}

export const analyticsService = new AnalyticsService();