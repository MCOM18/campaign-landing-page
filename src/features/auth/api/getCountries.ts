/**
 * Get Countries API
 * Fetches supported countries list from backend
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { ApiResponse, Country } from "../model/types";
import { mapCountryList } from "../model/mapper";
import { logger } from "@/lib/logger/logger";

// Helper to convert ISO code to flag emoji
export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return "🌐";
  }
}

export const FALLBACK_COUNTRIES: Country[] = [
  { countryCode: "IN", phoneCode: "+91", countryName: "India", flag: "🇮🇳" },
  { countryCode: "US", phoneCode: "+1", countryName: "United States", flag: "🇺🇸" },
  { countryCode: "GB", phoneCode: "+44", countryName: "United Kingdom", flag: "🇬🇧" },
  { countryCode: "AE", phoneCode: "+971", countryName: "United Arab Emirates", flag: "🇦🇪" },
  { countryCode: "CA", phoneCode: "+1", countryName: "Canada", flag: "🇨🇦" },
  { countryCode: "AU", phoneCode: "+61", countryName: "Australia", flag: "🇦🇺" },
  { countryCode: "SG", phoneCode: "+65", countryName: "Singapore", flag: "🇸🇬" },
  { countryCode: "NZ", phoneCode: "+64", countryName: "New Zealand", flag: "🇳🇿" },
];

export async function getCountries(sessionId?: string): Promise<ApiResponse<Country[]>> {
  try {
    logger.info('[Get Countries API] Requesting country list...');
    const response = await apiClient.get<any>(
      ApiEndpoint.GET_COUNTRIES,
      { headers: sessionId ? { sessionid: sessionId } : {} }
    );
    logger.info('[Get Countries API] Requesting country list...', response);
    const countries = mapCountryList(response);
    const processedCountries = countries.map(c => ({
      ...c,
      flag: c.flag || getFlagEmoji(c.countryCode)
    }));

    if (processedCountries.length === 0) {
      logger.warn('[Get Countries API] Empty response, returning fallback countries');
      return {
        metaData: { status: 200, message: "Fallback country list" },
        data: FALLBACK_COUNTRIES
      };
    }

    return {
      metaData: response.metaData,
      data: processedCountries
    };
  } catch (error) {
    logger.error('[Get Countries API] Failed to fetch countries, using fallbacks', error);
    return {
      metaData: { status: 200, message: "Fallback country list (error state)" },
      data: FALLBACK_COUNTRIES
    };
  }
}
