import { analyticsService } from "@/shared/analytics";

export type AnalyticsEvent =
  | "login_started"
  | "login_completed"
  | "login_failed"
  | "otp_sent"
  | "otp_verified"
  | "otp_failed"
  | "logout"
  | "page_view"
  | "payment_success"
  | "payment_failure"
  | "campaign_landing_impression"
  | "initiate_checkout"
  | "all_plan_data";

/**
 * Single entry point for all frontend analytics tracking.
 * Broadcasts the event to Firebase, CleverTap, and Backend.
 */
export function trackEvent(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  analyticsService.track(event, properties as Record<string, unknown>);
}