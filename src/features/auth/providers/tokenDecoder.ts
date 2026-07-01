import { REGEX } from '@/lib/constants/regex';
import { logger } from '@/lib/logger/logger';

interface DecodedToken {
  email?: string;
  sub?: string;
  name?: string;
  picture?: string;
  [key: string]: any;
}

export function decodeJWT(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      logger.error('[Token Decoder] Invalid JWT format');
      return null;
    }

    const payload = parts[1];

    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));

    // Parse JSON
    return JSON.parse(decoded);
  } catch (error) {
    logger.error('[Token Decoder] Failed to decode token', { error });
    return null;
  }
}

export function extractEmailFromToken(token: string, provider: string): string | null {
  const decoded = decodeJWT(token);

  if (decoded?.email) {
    const emailValue = decoded.email;
    const isPhoneNumber = REGEX.IS_PHONE_NUMBER_REGEX.test(emailValue) || REGEX.INTERNATIONAL_PHONE_NUMBER_REGEX.test(emailValue);

    if (isPhoneNumber) {
      logger.warn(`[Token Decoder] Phone number detected in email field for ${provider}`, {
        value: emailValue.substring(0, 3) + '***'
      });
      return null;
    }
    return decoded.email;
  }

  logger.warn(`[Token Decoder] No email found in ${provider} token`);
  return null;
}

export function hasPhoneNumberInsteadOfEmail(token: string): boolean {
  const decoded = decodeJWT(token);

  if (decoded?.email) {
    const emailValue = decoded.email;
    return REGEX.IS_PHONE_NUMBER_REGEX.test(emailValue) || REGEX.INTERNATIONAL_PHONE_NUMBER_REGEX.test(emailValue);
  }

  return false;
}
