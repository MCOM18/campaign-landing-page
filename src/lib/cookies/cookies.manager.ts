import { appConfig } from "../config/app.config";
import { logger } from "@lib/logger/logger";

const isClient = typeof window !== "undefined";

export const cookiesManager = {
  /**
   * Set a cookie with correct expiry.
   *
   * Bug fixed: previously used `days * appConfig.COOKIE_SET_TIME_LIMIT`
   * where COOKIE_SET_TIME_LIMIT = 24 * 60 * 60 * 1000 (milliseconds).
   * `Date.setTime` expects milliseconds, so that was correct for the
   * in-memory Date object — BUT `expires=` in a cookie string must be a
   * UTC date string, not a raw timestamp.  Using `max-age` (seconds) is
   * cleaner and more reliable.  We derive seconds directly: days × 86400.
   */
  set(key: string, value: string, days: number = appConfig.COOKIE_EXPIRY_DAYS): void {
    if (!isClient) return;
    try {
      const maxAgeSeconds = days * 24 * 60 * 60; // days → seconds
      const isSecure = window.location.protocol === "https:";
      const secureFlag = isSecure ? ";Secure" : "";
      document.cookie = `${key}=${value};max-age=${maxAgeSeconds};path=/;SameSite=Lax${secureFlag}`;
    } catch (error) {
      logger.warn(`[Cookies] Failed to set cookie: ${key}`, { error });
    }
  },

  get(key: string): string | null {
    if (!isClient) return null;
    try {
      const name = `${key}=`;
      for (let cookie of decodeURIComponent(document.cookie).split(";")) {
        cookie = cookie.trimStart();
        if (cookie.startsWith(name)) return cookie.substring(name.length);
      }
      return null;
    } catch {
      return null;
    }
  },

  remove(key: string): void {
    if (!isClient) return;
    try {
      document.cookie = `${key}=;max-age=0;path=/`;
    } catch (error) {
      logger.warn(`[Cookies] Failed to remove cookie: ${key}`, { error });
    }
  },
};
