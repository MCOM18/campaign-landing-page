/**
 * Auth Service
 * 
 * ONLY contains business logic and orchestration
 * NO React Query usage
 * NO UI/DOM access
 * 
 * Use service ONLY when orchestration is needed (multi-step flows)
 */

import { checkUser } from "../api/checkUser";
import { sendOtp } from "../api/sendOtp";
import { verifyOtp } from "../api/verifyOtp";
import { socialLogin } from "../api/socialLogin";
import {
  mapCheckUserResponse,
  mapSendOtpResponse,
  mapVerifyOtpResponse,
  mapSocialLoginResponse
} from "../model/mapper";
import { getUserGeoLocation } from "@/utils/userUtil";
import { AppError } from "@lib/error/types";
import { HttpStatus } from "@enums/http.enum";
import type { ApiResponse, VerifyOtpResponse, SocialLoginRequest, SocialLoginResponse } from "../model/types";
import { logger } from "@/lib/logger/logger";
import { LoginIdentifierType } from "@/enums/ui.enum";
import { analyticsService } from "@/shared/analytics";
import { trackEvent } from "@/services/analytics/events";

/**
 * Initiate OTP Flow
 * 
 * Orchestrates: checkUser → sendOtp (for both existing and new users)
 * 
 * @param phone - User's phone number or email
 * @param phoneCode - Country phone code (empty string for email)
 * @param sessionId - Optional session ID
 * @returns isSpecialUser and isExists flags
 */
export async function initiateOtpFlow(
  phone: string,
  phoneCode: string,
  sessionId?: string
): Promise<{ isSpecialUser: boolean; isExists: boolean }> {
  // Detect if input is email or phone
  const isEmail = phone.includes('@');
  const source = isEmail ? LoginIdentifierType.EMAIL : LoginIdentifierType.PHONE;

  logger.info('[Auth Service] initiateOtpFlow', { phone, phoneCode, isEmail, source });

  // Step 1: Check user (raw response)
  // Handle 404 gracefully - it means user doesn't exist (new registration)
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

  // Step 5: Send OTP (raw response) - for both existing and new users
  const geoData = getUserGeoLocation();

  const otpResponse = await sendOtp({
    phone_code: phoneCode,
    phone: phone,
    is_register: isRegistration, // true for new users, false for existing
    source: source,
    country: geoData?.country_code || undefined,
    state: geoData?.region || undefined,
    city: geoData?.city || undefined,
    lat: geoData?.lat?.toString() || undefined,
    long: geoData?.Long?.toString() || undefined,
  }, sessionId) as ApiResponse<any>;

  // Step 6: Validate metaData status
  if (otpResponse.metaData?.status !== 200) {
    // Track OTP failure
    analyticsService.trackOtpFailed({
      phone_code: phoneCode,
      phone: phone,
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
    analyticsService.trackOtpFailed({
      phone_code: phoneCode,
      phone: phone,
      source: source,
      error_code: 'otp_not_sent',
      error_message: 'Failed to send OTP',
      attempts: 1,
    });

    throw new AppError("Failed to send OTP", HttpStatus.INTERNAL_SERVER_ERROR);
  }

  // Track OTP sent successfully
  analyticsService.trackOtpSent({
    phone_code: phoneCode,
    phone: phone,
    source: source,
    is_register: isRegistration,
  });

  return {
    isSpecialUser: isSpecialUser,
    isExists: !isRegistration, // Return actual is_exists value
  };
}

/**
 * Complete OTP Verification
 * 
 * Single step - verifies OTP and returns session
 * 
 * @param phone - User's phone number or email
 * @param phoneCode - Country phone code (empty string for email)
 * @param otp - OTP code
 * @param isRegister - Whether this is a registration flow
 * @param sessionId - Optional session ID
 * @returns Auth session data
 */
export async function completeOtpVerification(
  phone: string,
  phoneCode: string,
  otp: string,
  isRegister: boolean = false,
  sessionId?: string
): Promise<VerifyOtpResponse> {
  // Detect if input is email or phone
  const isEmail = phone.includes('@');
  const source = isEmail ? LoginIdentifierType.EMAIL : LoginIdentifierType.PHONE;

  const startTime = Date.now();

  // Step 1: Verify OTP (raw response)
  const response = await verifyOtp({
    phone_code: phoneCode,
    phone: phone,
    otp: otp,
    is_register: isRegister,
    source: source,
  }, sessionId) as ApiResponse<any>;

  // Step 2: Validate metaData status
  // Accept both 200 (existing user) and 201 (new user registration)
  const status = response.metaData?.status;
  if (status !== 200 && status !== 201) {
    // Track OTP verification failure
    analyticsService.trackOtpFailed({
      phone_code: phoneCode,
      phone: phone,
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
  analyticsService.trackOtpVerified({
    phone_code: phoneCode,
    phone: phone,
    source: source,
    is_register: isRegister,
    verification_time_seconds: verificationTime,
  });

  // Track login success
  analyticsService.trackLoginSuccess({
    method: 'otp',
    is_new_user: status === 201,
    phone_code: phoneCode,
    phone: phone,
    source: source,
  });

  // Track backend login event
  trackEvent("login", {
    method: "otp",
    source: source,
    user_id: mapped.user_id,
  });

  return mapped;
}

/**
 * Social Login Service
 * 
 * Simple orchestration - just calls API
 * 
 * @param request - Social login request
 * @param sessionId - Optional session ID
 * @returns Social login response with isNewUser flag
 */
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
    analyticsService.trackLoginFailed({
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

  // Track login success
  analyticsService.trackLoginSuccess({
    method: request.source as 'google' | 'facebook' | 'apple',
    is_new_user: isNewUser,
    source: 'phone', // Social login doesn't use email/phone source
  });

  // Track backend login event
  trackEvent("login", {
    method: request.source as 'google' | 'facebook' | 'apple',
    source: 'phone',
    user_id: mapped.user_id,
  });

  return {
    ...mapped,
    isNewUser,
  };
}
