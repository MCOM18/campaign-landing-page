/**
 * HTTP header constants
 * Simple, flat structure for easy access
 */
export const HEADERS = {
  // Standard headers
  CONTENT_TYPE: "Content-Type",
  AUTHORIZATION: "Authorization",
  ACCEPT: "Accept",

  // Content types
  JSON: "application/json",
  MULTIPART: "multipart/form-data",

  // Custom headers (keys)
  DEVICE_TYPE_CODE: "deviceTypeCode",
  DEVICE_ID: "deviceID",
  LANGUAGE: "language",
  APP_VERSION: "appversion",
  PROJECT: "project",
  SESSION_ID: "sessionid",
} as const;

export const DEFAULT_HEADER_VALUES = {
  DEVICE_TYPE_CODE: "3",
  LANGUAGE: "1",
  APP_VERSION: "2.0.0",
  PROJECT: "JOJO",
} as const;
