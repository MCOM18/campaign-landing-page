"use client";

import { ReactNode, useEffect, useState } from "react";
import { fetchConfig, setAppConfig } from "@lib/config/app.config";
import { fetchGeoData } from "@lib/geo/geo.service";
import { getCachedGeo, setCachedGeo } from "@lib/geo/geo.cache";
import { logger } from "@lib/logger/logger";
import { BootstrapContext } from "./BootstrapContext";
import { getAllPlans } from "@/features/subscription/api/getAllPlans";
import { getSpecialOfferPlan } from "@/features/subscription/api/getSpecialOfferPlan";

interface BootstrapProviderProps {
  children: ReactNode;
}

type BootstrapState = "loading" | "ready" | "error";

export function BootstrapProvider({ children }: BootstrapProviderProps) {
  const [state, setState] = useState<BootstrapState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch - only show loading UI after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        logger.info("[Bootstrap] Starting...");

        // STEP 1: Fetch config
        logger.info("[Bootstrap] Fetching config...");
        const config = await fetchConfig();

        if (cancelled) {
          logger.info("[Bootstrap] Cancelled (cleanup)");
          return;
        }

        // Store config in memory
        setAppConfig(config);

        logger.info("[Bootstrap] Config loaded", {
          apiBaseUrl: config.apiBaseUrl,
          envType: config.envType,
          publicIp: config.publicIp
        });

        // STEP 2: Geo with cache check
        const publicIp = config.publicIp || '';

        // Check cache
        const cachedGeo = getCachedGeo(publicIp);
        let activeGeoData = null;

        if (cachedGeo) {
          // Use cached geo
          logger.info("[Bootstrap] Using cached geo data");
          activeGeoData = cachedGeo.geoData;
        } else {
          // Fetch fresh geo data
          logger.info("[Bootstrap] Fetching fresh geo data...");

          try {
            const { geoData, isAvailable } = await fetchGeoData(publicIp);

            if (cancelled) return;

            // Cache the result
            setCachedGeo(geoData, publicIp, isAvailable);
            activeGeoData = geoData;

            logger.info("[Bootstrap] Geo data fetched and cached", {
              country: geoData.country_code,
              isAvailable
            });
          } catch (geoError) {
            // Geo failure should NOT block app
            logger.warn("[Bootstrap] Geo fetch failed, using fallback", {
              error: geoError instanceof Error ? geoError.message : 'Unknown'
            });
          }
        }

        // Set geolocation data in config
        const finalGeoData = activeGeoData || {
          country_code: 'IN',
          region: '',
          city: '',
        };

        config.geoLocationData = {
          countryCode: finalGeoData.country_code,
          region: finalGeoData.region || '',
          city: finalGeoData.city || '',
        };

        // STEP 2.5: Fetch Special Offer Plan (used by /campaign route)
        try {
          logger.info("[Bootstrap] Fetching special offer plan...");
          const offerResponse = await getSpecialOfferPlan({
            country: config.geoLocationData.countryCode || "IN",
            countryCode: config.geoLocationData.countryCode || "IN",
            sState: config.geoLocationData.region || "",
            city: config.geoLocationData.city || "",
            bIsRegistered: false,
            fcmToken: ""
          });
          config.specialOfferPlan = offerResponse.data;
          logger.info("[Bootstrap] Special offer plan loaded successfully", offerResponse.data);
        } catch (offerError) {
          // Special offer plan failure should NOT block app
          logger.warn("[Bootstrap] Failed to fetch special offer plan", {
            error: offerError instanceof Error ? offerError.message : 'Unknown'
          });
        }

        // STEP 3: Set app ready
        if (cancelled) return;

        setIsAppReady(true);
        setState("ready");

        logger.info("[Bootstrap] App ready");

      } catch (err) {
        if (cancelled) return;

        const message = err instanceof Error ? err.message : "Unknown error";
        logger.error("[Bootstrap] Failed", { error: message });
        setError(message);
        setState("error");
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  // During SSR and initial render, render children immediately to prevent hydration mismatch
  if (!isMounted) {
    return (
      <BootstrapContext.Provider value={{ isAppReady: false }}>
        {children}
      </BootstrapContext.Provider>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0c0b0a] text-white z-50">
        <div className="max-w-md text-center px-4">
          <div className="mb-4 text-6xl">⚠️</div>
          <h1 className="mb-2 text-2xl font-bold text-red-500">
            Failed to load configuration
          </h1>
          <p className="mb-4 text-gray-400">
            We couldn't connect to our servers to load the app settings. Please check your internet connection and try again.
          </p>
          {error && (
            <p className="mb-6 text-sm text-gray-500 font-mono">
              Error: {error}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-yellow-500 px-6 py-2 text-[#0c0b0a] font-bold hover:bg-yellow-400 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Ready state - provide context
  return (
    <BootstrapContext.Provider value={{ isAppReady }}>
      {children}
    </BootstrapContext.Provider>
  );
}
