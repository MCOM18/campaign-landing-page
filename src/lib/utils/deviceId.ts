import { StorageKey } from "@enums/storage.enum";
import { localStorageManager } from "@lib/localStorage/localStorage.manager";

/**
 * Generates a unique browser/device ID
 * Stored in localStorage for persistence
 */
export function getBrowserUID(): string {
  // Check if we already have a device ID
  const existingId = localStorageManager.get<string>(StorageKey.DEVICE_ID);
  
  if (existingId) {
    return existingId;
  }

  // Generate new device ID
  const deviceId = generateDeviceId();
  
  // Store for future use
  localStorageManager.set(StorageKey.DEVICE_ID, deviceId);
  
  return deviceId;
}

/**
 * Generates a unique device ID using browser fingerprint
 */
function generateDeviceId(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: Generate UUID v4 manually
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Clears the stored device ID (useful for logout)
 */
export function clearDeviceId(): void {
  localStorageManager.remove(StorageKey.DEVICE_ID);
}
