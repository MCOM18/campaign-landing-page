import { ANALYTICS_STORAGE_KEYS } from '../constants/analytics.constants';
import type { DeviceContext } from '../model/context.types';
import { v4 as uuidv4 } from 'uuid';

function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(ANALYTICS_STORAGE_KEYS.DEVICE_ID);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(ANALYTICS_STORAGE_KEYS.DEVICE_ID, id);
  }
  return id;
}

function parseUserAgent() {
  if (typeof window === 'undefined') {
    return { browser: 'unknown', browser_version: 'unknown', os: 'unknown', os_version: 'unknown' };
  }
  const ua = navigator.userAgent;
  let browser = 'unknown', browser_version = 'unknown', os = 'unknown', os_version = 'unknown';

  const isBrave = typeof navigator !== 'undefined' && !!(navigator as unknown as Record<string, unknown>).brave;

  if (isBrave) {
    browser = 'Brave';
    browser_version = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] || ua.match(/Brave\/(\d+\.\d+)/)?.[1] || 'unknown';
  } else if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browser = 'Chrome';
    browser_version = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] || 'unknown';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari';
    browser_version = ua.match(/Version\/(\d+\.\d+)/)?.[1] || 'unknown';
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox';
    browser_version = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] || 'unknown';
  } else if (ua.includes('Edg')) {
    browser = 'Edge';
    browser_version = ua.match(/Edg\/(\d+\.\d+)/)?.[1] || 'unknown';
  }

  if (ua.includes('Windows')) {
    os = 'Windows';
    os_version = ua.includes('Windows NT 10.0') ? '10' : 'other';
  } else if (ua.includes('Mac OS X')) {
    os = 'macOS';
    os_version = ua.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace('_', '.') || 'unknown';
  } else if (ua.includes('Android')) {
    os = 'Android';
    os_version = ua.match(/Android (\d+\.\d+)/)?.[1] || 'unknown';
  } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
    os_version = ua.match(/OS (\d+[._]\d+)/)?.[1]?.replace('_', '.') || 'unknown';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  }

  return { browser, browser_version, os, os_version };
}

export function buildDevicePayload(): DeviceContext {
  if (typeof window === 'undefined') {
    return {
      device_id: '', deviceTypeCode: 'server', browser: 'unknown', browser_version: 'unknown',
      os: 'unknown', os_version: 'unknown', screen_width: 0, screen_height: 0,
      viewport_width: 0, viewport_height: 0, timezone: 'UTC', language: 'en'
    };
  }
  const uaInfo = parseUserAgent();
  return {
    device_id: getDeviceId(),
    deviceTypeCode: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
    ...uaInfo,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  };
}
