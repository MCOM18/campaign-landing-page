import { LoginIdentifierType } from "@/enums/ui.enum";
import { analyticsService } from "@/shared/analytics";

export type AnalyticsEvent =
  | "login"
  | "logout"
  | "page_view";

export function trackEvent(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  analyticsService.track(event, properties as Record<string, unknown>);
}

export function trackLoginStarted(
  method: LoginIdentifierType.PHONE | LoginIdentifierType.EMAIL,
  value?: string
): void {
  analyticsService.trackLoginStarted(method, value);
}

export function trackLoginCompleted(
  method: LoginIdentifierType.PHONE | LoginIdentifierType.EMAIL,
  value?: string,
  otp?: string,
  phoneCode?: string,
  phoneOnly?: string
): Promise<unknown> {
  analyticsService.trackLoginCompleted({ method, value, otp, phoneCode, phoneOnly });
  return Promise.resolve();
}

export function trackCampaignLandingImpression(payloadData: Record<string, unknown>): void {
  analyticsService.trackCampaignLandingImpression(payloadData);
}