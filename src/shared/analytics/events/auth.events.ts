import { EVENT_NAMES } from '../constants/analytics.constants';
import { EventCriticality } from '../model/provider.types';
import { type AnalyticsEvent } from '../model/common.types';
import {
  type LoginSuccessEvent,
  type LoginFailedEvent,
  type OtpSentEvent,
  type OtpVerifiedEvent,
  type OtpFailedEvent,
  type LogoutEvent
} from '../model/auth.types';

export const authEvents = {
  loginSuccess: (data: LoginSuccessEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.LOGIN_SUCCESS,
    properties: data as any,
    criticality: EventCriticality.CRITICAL,
  }),

  loginFailed: (data: LoginFailedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.LOGIN_FAILED,
    properties: data as any,
    criticality: EventCriticality.HIGH,
  }),

  otpSent: (data: OtpSentEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.OTP_SENT,
    properties: data as any,
    criticality: EventCriticality.HIGH,
  }),

  otpVerified: (data: OtpVerifiedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.OTP_VERIFIED,
    properties: data as any,
    criticality: EventCriticality.HIGH,
  }),

  otpFailed: (data: OtpFailedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.OTP_FAILED,
    properties: data as any,
    criticality: EventCriticality.HIGH,
  }),

  logout: (data?: LogoutEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.LOGOUT,
    properties: (data || {}) as any,
    criticality: EventCriticality.HIGH,
  }),
};
