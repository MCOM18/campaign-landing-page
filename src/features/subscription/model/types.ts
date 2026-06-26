/**
 * Subscription Feature Types
 */

export interface SpecialOfferPlanRequest {
  country: string;
  countryCode: string;
  sState: string;
  city: string;
  bIsRegistered: boolean;
  fcmToken: string
}

export interface SpecialOfferPlanResponse {
  [key: string]: any;
}
