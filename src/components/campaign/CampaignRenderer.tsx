"use client";

import type { CampaignItem } from "@/types/campaign";
import MovieCampaignClient from "./MovieCampaignClient";

export interface CampaignRendererProps {
  type: string;
  item: CampaignItem;
}

/**
 * Presentation layer for campaign routes.
 * Receives the resolved { type, item } and delegates to the appropriate view.
 * Currently all content types share the unified MovieCampaignClient UI.
 */
export function CampaignRenderer({ type, item }: CampaignRendererProps) {
  // Currently all designs are unified under MovieCampaignClient.
  // The type-specific conditions are preserved below for future UI divergence:
  /*
  if (type === "movies") {
    return <MovieCampaignClient initialCampaign={item} />;
  }

  // Show campaigns use the show detail view
  if (type === "shows") {
    return <ShowDetail show={item as unknown as CampaignContentConfig} />;
  }
  */

  // Render unified campaign UI for all content types
  return <MovieCampaignClient initialCampaign={item} type={type} />;
}

export default CampaignRenderer;
