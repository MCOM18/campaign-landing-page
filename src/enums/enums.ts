export const PAYMENT_METHOD = {
  CARD: "card",
  UPI: "upi",
} as const;

export type PaymentMethod = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD];
