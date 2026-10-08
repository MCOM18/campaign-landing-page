// Display-only price formatting. Truncates (not rounds) to at most 2 decimals:
// 99.155448 -> "99.15", 399.2 -> "399.2", 499 -> "499"
export const formatPrice = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "";
  return formatPriceText(String(value));
};

// Same truncation for numbers inside a display string, e.g. "₹99.155448/year" -> "₹99.15/year"
export const formatPriceText = (text: string | null | undefined): string =>
  text ? text.replace(/(\d+\.\d{2})\d+/g, "$1") : "";
