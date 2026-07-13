export const PAYMENT_METHOD = {
  CARD: "card",
  UPI: "upi",
} as const;

export type PaymentMethod = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD];

/** jojoapp.in asset type IDs */
export const AssetType = Object.freeze({
  MOVIE: 1,
  SHOW: 2,
  SERIES: 3,
  SEASON: 4,
  EPISODE: 5,
  NATAK: 6,
  LIVE: 7,
  COLLECTION: 8,
  KIDZ: 9,
} as const);

/** Maps decoded `type` number → jojoapp.in URL path segment */
export const slugMap: Record<number, string> = {
  [AssetType.MOVIE]: "movies",
  [AssetType.SHOW]: "shows",
  [AssetType.SERIES]: "shows",       // Both SHOW and SERIES use "shows"
  [AssetType.SEASON]: "seasons",
  [AssetType.EPISODE]: "episodes",
  [AssetType.NATAK]: "nataks",
  [AssetType.LIVE]: "live",
  [AssetType.COLLECTION]: "collections",
  [AssetType.KIDZ]: "kidz",
};

export enum PurchaseStatus {
  INITIATED = "INITIATED",
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}
