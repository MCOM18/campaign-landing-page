export enum ApiEndpoint {
  // Config
  CONFIG = "/app-config",
  CHECK_AVAILABILITY = "/v3/auth/check-availability",
  GEO_LOCATION = "/v3/auth/geo-location",
  GET_COUNTRIES = "/v3/auth/country-list",


  // Auth - OTP Flow
  CHECK_USER = "/v3/auth/check-user",
  SEND_OTP = "/v3/auth/send-otp",
  VERIFY_OTP = "/v3/auth/verify-otp",
  VERIFY_SPECIAL_USER = "/v3/auth/verify-special-user",

  // Auth - Captcha
  VERIFY_CAPTCHA = "/v3/jojo/verify-captcha",

  // Auth - Social Login
  SOCIAL_LOGIN = "/v3/auth/social",
  GOOGLE_LOGIN = "/auth/google-login",
  FACEBOOK_LOGIN = "/auth/facebook-login",

  // Auth - Guest
  GUEST_LOGIN = "/v3/auth/guest",

  // Profile
  GET_PROFILES = "/profile",
  CREATE_PROFILE = "/profile",
  UPDATE_PROFILE = "/profile",
  GET_AVATARS = "/avatar",



  // All plans endpoint
  ALL_PLANS = "/subscription/allplans",
  SPECIAL_OFFER_PLAN = "/subscription/guest/special-offer-plan",

  // Events
  LOGIN_STARTED_EVENT = "/v1/jojoevents/login_started",
  LOGIN_COMPLETED_EVENT = "/v1/jojoevents/login_completed",
  CAMPAIGN_IMPRESSION = "/v1/jojoevents/campaign_landing_impression",
}
