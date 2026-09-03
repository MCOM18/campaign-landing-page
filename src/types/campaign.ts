export interface CampaignItem {
  key: string;
  slug: string;
  path: string;
  title: string;
  type?: string;

  imageBaseUrl?: string;

  images?: {
    poster?: string;
    posterMobile?: string;
    title?: string;
  };

  videos?: {
    trailer?: string;
    trailerMobile?: string;
  };

  panel?: {
    background?: string;
    backgroundHex?: string;
  };

  [key: string]: unknown;
}

export interface ResolvedCampaignItem {
  type: string;
  item: CampaignItem;
}

export interface CampaignRoute {
  miscSlug: string;
  path: string;
  type: string;
  slug: string;
  item: CampaignItem;
}
