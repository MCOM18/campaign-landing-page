export const COUPON_MAX_LENGTH = 16;

const COUPON_CODE_REGEX = /^[A-Za-z0-9-]{6,16}$/;

// Uppercases and strips anything outside A-Z, 0-9 and "-", capped at max length
export const sanitizeCouponInput = (value: string) =>
  value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, COUPON_MAX_LENGTH);

export const isValidCouponCode = (value: string) => COUPON_CODE_REGEX.test(value);
