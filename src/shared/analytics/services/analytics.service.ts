/**
 * Analytics Service Mock
 * 
 * Simplified, robust logger for 7day-Trial-web.
 * Prevents dependencies on third-party SDKs (Firebase/CleverTap) and profile stores.
 */

import { logger } from "@lib/logger/logger";
import { appConfig } from "@/lib/config/app.config";

class AnalyticsService {
  private isEnabled = true;

  initialize(): void {
    logger.info("Analytics: Initialized Mock Analytics Service");
  }

  track(event: string, properties?: Record<string, any>): void {
    if (!this.isEnabled || !appConfig.flags.enableAnalytics) return;
    logger.info(`[Analytics Event] ${event}`, properties);
  }

  trackLoginSuccess(data: any): void {
    this.track("login_success", data);
  }

  trackLoginFailed(data: any): void {
    this.track("login_failed", data);
  }

  trackOtpSent(data: any): void {
    this.track("otp_sent", data);
  }

  trackOtpVerified(data: any): void {
    this.track("otp_verified", data);
  }

  trackOtpFailed(data: any): void {
    this.track("otp_failed", data);
  }

  trackLogout(data?: any): void {
    this.track("logout", data);
  }

  identifyUser(userId: string, properties?: Record<string, any>): void {
    this.track("identify_user", { userId, ...properties });
  }

  updateUserProperties(properties: Record<string, any>): void {
    this.track("update_user_properties", properties);
  }

  resetUser(): void {
    this.track("reset_user");
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  getEnabled(): boolean {
    return this.isEnabled;
  }
}

export const analyticsService = new AnalyticsService();
export type AnalyticsEvent = any;
export type EventContext = any;
