import { ANALYTICS_STORAGE_KEYS } from '../constants/analytics.constants';
import type { SessionContext } from '../model/context.types';
import { v4 as uuidv4 } from 'uuid';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(ANALYTICS_STORAGE_KEYS.SESSION_ID);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(ANALYTICS_STORAGE_KEYS.SESSION_ID, id);
    localStorage.setItem(ANALYTICS_STORAGE_KEYS.SESSION_START, new Date().toISOString());
  }
  return id;
}

// Export this so other modules or tests can access it if needed
export function getSessionStartTime(): string {
  if (typeof window === 'undefined') return new Date().toISOString();
  let start = localStorage.getItem(ANALYTICS_STORAGE_KEYS.SESSION_START);
  if (!start) {
    start = new Date().toISOString();
    localStorage.setItem(ANALYTICS_STORAGE_KEYS.SESSION_START, start);
  }
  return start;
}

function getSessionDuration(): number {
  if (typeof window === 'undefined') return 0;
  const start = new Date(getSessionStartTime()).getTime();
  return Math.floor((Date.now() - start) / 1000);
}

export function buildSessionPayload(): SessionContext {
  return {
    session_id: getSessionId(),
    session_start_time: getSessionStartTime(),
    session_duration_seconds: getSessionDuration(),
  };
}

export function resetSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ANALYTICS_STORAGE_KEYS.SESSION_ID);
  localStorage.removeItem(ANALYTICS_STORAGE_KEYS.SESSION_START);
}
