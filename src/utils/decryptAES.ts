import CryptoJS from "crypto-js";

// Converts hex string to CryptoJS WordArray
function hexToWordArray(hex: string) {
  return CryptoJS.enc.Hex.parse(hex);
}

// Converts base64 string to CryptoJS WordArray
function base64ToWordArray(base64: string) {
  return CryptoJS.enc.Base64.parse(base64);
}

import { logger } from "@/lib/logger/logger";

export function decryptAES(encryptedHex: string, base64Key: string, hexIV: string) {
  try {
    const key = base64ToWordArray(base64Key);   // 32-byte AES key
    const iv = hexToWordArray(hexIV);           // 16-byte IV
    const ciphertext = hexToWordArray(encryptedHex);

    const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });

    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    if (!plaintext) {
      throw new Error("Decryption returned empty string");
    }
    return JSON.parse(plaintext);
  } catch (error) {
    logger.error("AES Decryption failed:", error);
    throw error;
  }
}
