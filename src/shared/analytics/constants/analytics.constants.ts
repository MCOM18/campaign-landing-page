export const QUEUE_LIMITS = {
  MAX_QUEUE_SIZE: 100,
  MAX_OFFLINE_QUEUE_SIZE: 50,
  MAX_EVENT_SIZE_BYTES: 5 * 1024,      // 5KB per event
  MAX_TOTAL_STORAGE_BYTES: 50 * 1024,  // 50KB total for offline queue
} as const;

export const EVENT_NAMES = {
  // LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  OTP_SENT: 'otp_sent',
  OTP_VERIFIED: 'otp_verified',
  OTP_FAILED: 'otp_failed',
  LOGOUT: 'logout',
  SCREEN_VIEWED: 'screen_viewed',
  CAMPAIGN_LANDING_IMPRESSION: 'campaign_landing_impression',
  LOGIN_STARTED: 'login_started',
  LOGIN_COMPLETED: 'login_completed',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILURE: 'payment_failure',
} as const;

export const GA4_LIMITS = {
  MAX_EVENT_NAME_LENGTH: 40,
  MAX_PARAM_NAME_LENGTH: 40,
  MAX_PARAM_VALUE_LENGTH: 100,
  MAX_PARAMS_PER_EVENT: 25,
} as const;

export const ANALYTICS_STORAGE_KEYS = {
  OFFLINE_QUEUE: 'analytics_offline_queue',
  SESSION_ID: 'analytics_session_id',
  SESSION_START: 'analytics_session_start',
  DEVICE_ID: 'ott_device_id',
} as const;

export const isProduction = (): boolean => process.env.NODE_ENV === 'production';
export const isDevelopment = (): boolean => process.env.NODE_ENV === 'development';
