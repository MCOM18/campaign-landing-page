/**
 * Auth Service
 * 
 * ONLY contains business logic and orchestration
 * NO React Query usage
 * NO UI/DOM access
 * 
 * Use service ONLY when orchestration is needed (multi-step flows)
 */

import { LoginIdentifierType } from "@/enums/ui.enum";
import { logger } from "@/lib/logger/logger";
import { getSourceLink } from "@/shared/analytics";
import { trackEvent } from "@/services/analytics/events";
import { getUserGeoLocation } from "@/utils/userUtil";
import { HttpStatus } from "@enums/http.enum";
import { AppError } from "@lib/error/types";
import { checkUser } from "../api/checkUser";
import { sendOtp } from "../api/sendOtp";
import { socialLogin } from "../api/socialLogin";
import { verifyOtp } from "../api/verifyOtp";
import {
  mapCheckUserResponse,
  mapSendOtpResponse,
  mapSocialLoginResponse,
  mapVerifyOtpResponse
} from "../model/mapper";
import type { ApiResponse, SocialLoginRequest, SocialLoginResponse, VerifyOtpResponse } from "../model/types";

export async function initiateOtpFlow(
  phone: string,
  phoneCode: string,
  sessionId?: string
): Promise<{ isSpecialUser: boolean; isExists: boolean }> {
  const isEmail = phone.includes('@');
  const source = isEmail ? LoginIdentifierType.EMAIL : LoginIdentifierType.PHONE;
  const identifierProps = isEmail ? { email: phone } : { phone: phone, phone_code: phoneCode };

  logger.info('[Auth Service] initiateOtpFlow', { phone, phoneCode, isEmail, source });

  let userCheckResponse: ApiResponse<any>;
  let isRegistration = false;
  let isSpecialUser = false;

  try {
    userCheckResponse = await checkUser({
      phone_code: phoneCode,
      phone: phone,
      source: source,
    }, sessionId) as ApiResponse<any>;

    // Step 2: Validate metaData status
    if (userCheckResponse.metaData?.status !== 200) {
      throw new AppError(
        userCheckResponse.metaData?.message || 'Check user failed',
        userCheckResponse.metaData?.status as HttpStatus || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // Step 3: Map response
    const userCheck = mapCheckUserResponse(userCheckResponse);
    isRegistration = !userCheck.is_exists;
    isSpecialUser = userCheck.is_special_user;

  } catch (error) {
    // Handle 404 - user doesn't exist, proceed with registration
    if (error instanceof AppError && error.status === HttpStatus.NOT_FOUND) {
      logger.info('[Auth Service] User not found (404), treating as new registration');
      isRegistration = true;
      isSpecialUser = false;
    } else {
      // Re-throw other errors
      throw error;
    }
  }

  // Step 4: Log registration status
  if (isRegistration) {
    logger.info('[Auth Service] New user detected, sending OTP with is_register: true');
  } else {
    logger.info('[Auth Service] Existing user detected, sending OTP with is_register: false');
  }

  const otpResponse = await sendOtp({
    phone_code: phoneCode,
    phone: phone,
    is_register: isRegistration, // true for new users, false for existing
    source: source
  }, sessionId) as ApiResponse<any>;

  // Step 6: Validate metaData status
  if (otpResponse.metaData?.status !== 200) {
    // Track OTP failure
    trackEvent("otp_failed", {
      ...identifierProps,
      source: source,
      error_code: String(otpResponse.metaData?.status || 'unknown'),
      error_message: otpResponse.metaData?.message || 'Send OTP failed',
      attempts: 1,
    });

    throw new AppError(
      otpResponse.metaData?.message || 'Send OTP failed',
      otpResponse.metaData?.status as HttpStatus || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  // Step 7: If metaData status is 200, consider it success even if data is null
  // Some APIs return data: null with success message
  const otp = mapSendOtpResponse(otpResponse);

  // Only check otp_sent if data was not null
  if (otpResponse.data !== null && !otp.otp_sent) {
    // Track OTP failure
    trackEvent("otp_failed", {
      ...identifierProps,
      source: source,
      error_code: 'otp_not_sent',
      error_message: 'Failed to send OTP',
      attempts: 1,
    });

    throw new AppError("Failed to send OTP", HttpStatus.INTERNAL_SERVER_ERROR);
  }

  // Track OTP sent successfully
  trackEvent("otp_sent", {
    ...identifierProps,
    source: source,
    is_register: isRegistration,
  });

  return {
    isSpecialUser: isSpecialUser,
    isExists: !isRegistration, // Return actual is_exists value
  };
}

export async function completeOtpVerification(
  phone: string,
  phoneCode: string,
  otp: string,
  isRegister: boolean = false,
  sessionId?: string,
  country?: string,
  state?: string,
  city?: string,
): Promise<VerifyOtpResponse> {
  // Detect if input is email or phone
  const isEmail = phone.includes('@');
  const source = isEmail ? LoginIdentifierType.EMAIL : LoginIdentifierType.PHONE;
  const identifierProps = isEmail ? { email: phone } : { phone: phone, phone_code: phoneCode };

  const startTime = Date.now();

  // Retrieve geolocation data for fallback if not provided
  const geoData = getUserGeoLocation();
  const finalCountry = country || geoData?.country_code || undefined;
  const finalState = state || geoData?.region || undefined;
  const finalCity = city || geoData?.city || undefined;

  // Step 1: Verify OTP (raw response)
  // NOTE: The API client throws an AppError for 4xx responses (e.g. 400 wrong OTP)
  // instead of returning the response. We catch that here to fire otp_failed before re-throwing.
  let response: ApiResponse<any>;
  try {
    response = await verifyOtp({
      phone_code: phoneCode,
      phone: phone,
      otp: otp,
      is_register: isRegister,
      source: source,
      country: finalCountry,
      state: finalState,
      city: finalCity,
      lat: geoData?.lat,
      lng: geoData?.lng
    }, sessionId) as ApiResponse<any>;
  } catch (apiError) {
    // Track OTP failure when API throws (e.g. 400 wrong OTP)
    trackEvent("otp_failed", {
      ...identifierProps,
      source: source,
      error_code: apiError instanceof AppError ? String(apiError.status) : 'unknown',
      error_message: apiError instanceof Error ? apiError.message : 'OTP verification failed',
      attempts: 1,
    });
    throw apiError;
  }

  // Step 2: Validate metaData status
  // Accept both 200 (existing user) and 201 (new user registration)
  const status = response.metaData?.status;
  if (status !== 200 && status !== 201) {
    // Track OTP verification failure (for cases where API returns 200 HTTP but error in metaData)
    trackEvent("otp_failed", {
      ...identifierProps,
      source: source,
      error_code: String(status || 'unknown'),
      error_message: response.metaData?.message || 'OTP verification failed',
      attempts: 1,
    });

    throw new AppError(
      response.metaData?.message || 'OTP verification failed',
      status as HttpStatus || HttpStatus.BAD_REQUEST
    );
  }

  // Step 3: Map response
  const mapped = mapVerifyOtpResponse(response);

  // Calculate verification time
  const verificationTime = Math.floor((Date.now() - startTime) / 1000);

  // Track OTP verification success
  trackEvent("otp_verified", {
    ...identifierProps,
    source: source,
    is_register: isRegister,
    verification_time_seconds: verificationTime,
  });

  const sourceLink = getSourceLink();

  // Track login completed containing all parameters
  trackEvent("login_completed", {
    method: 'otp',
    is_new_user: status === 201,
    ...identifierProps,
    source: source,
    user_id: mapped.user_id,
    session_id: mapped.session_id,
    value: phone.includes('@') ? phone : `+${phoneCode.replace(/\D/g, '')}${phone.replace(/\D/g, '')}`,
    otp: otp,
  });

  return mapped;
}

export async function socialLoginService(
  request: SocialLoginRequest,
  sessionId?: string
): Promise<SocialLoginResponse> {
  // Step 1: Call social login API
  const response = await socialLogin(request, sessionId) as ApiResponse<any>;

  // Step 2: Validate metaData status
  // Accept both 200 (existing user) and 201 (new user registration)
  const status = response.metaData?.status;
  if (status !== 200 && status !== 201) {
    // Track login failure
    trackEvent("login_failed", {
      method: request.source as 'google' | 'facebook' | 'apple',
      error_code: String(status || 'unknown'),
      error_message: response.metaData?.message || 'Social login failed',
      source: 'phone', // Social login doesn't use email/phone source
    });

    throw new AppError(
      response.metaData?.message || 'Social login failed',
      status as HttpStatus || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  // Step 3: Map response
  const mapped = mapSocialLoginResponse(response);

  // Step 4: Add isNewUser flag based on status code
  const isNewUser = status === 201;

  // Step 5: Log the status for debugging
  if (isNewUser) {
    logger.info('[Auth Service] New user registered via social login');
  } else {
    logger.info('[Auth Service] Existing user logged in via social login');
  }

  const sourceLink = getSourceLink();

  // Track login completed containing all parameters
  trackEvent("login_completed", {
    method: request.source as 'google' | 'facebook' | 'apple',
    is_new_user: isNewUser,
    source: 'phone',
    user_id: mapped.user_id,
    session_id: mapped.session_id,
    value: mapped.email || mapped.phone || '',
    phone: mapped.phone || '',
    email: mapped.email || '',
  });

  return {
    ...mapped,
    isNewUser,
  };
}
