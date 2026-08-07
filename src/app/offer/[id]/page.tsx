"use client";

import { use, useEffect } from "react";
import { useParams } from "next/navigation";
import { JojoLogo } from "@/components/Icons";
import { useOfferByCampaign } from "@/features/offer/hooks/useOfferByCampaign";
import { logger } from "@/lib/logger/logger";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OfferDetailsPage({ params }: PageProps) {
  const routeParams = useParams();
  const unwrappedParams = params ? use(params) : null;
  const campaignId = (routeParams?.id as string) || unwrappedParams?.id || "";

  const { data, isLoading, isError, error, refetch } = useOfferByCampaign(campaignId);

  useEffect(() => {
    if (campaignId) {
      logger.info(`[OfferDetailsPage] Loaded offer details page for campaignId: ${campaignId}`);
    }
  }, [campaignId]);

  return (
    <main className="app-container">
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "center", width: "100%" }}>
        <JojoLogo />
      </header>

      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.5rem",
        }}
      >
        <h1
          className="gold-text-gradient"
          style={{
            fontSize: "24px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "1px",
            textAlign: "center",
          }}
        >
          Offer Details
        </h1>

        <div style={{ color: "var(--text-secondary)", fontSize: "14px", textAlign: "center" }}>
          Campaign ID: <strong style={{ color: "#FAAF3F" }}>{campaignId || "N/A"}</strong>
        </div>

        {isLoading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              margin: "2rem 0",
            }}
          >
            <div className="premium-loader" />
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Fetching campaign offer details...</p>
          </div>
        )}

        {isError && (
          <div
            style={{
              backgroundColor: "rgba(255, 59, 48, 0.1)",
              border: "1px solid rgba(255, 59, 48, 0.3)",
              borderRadius: "12px",
              padding: "1rem 1.5rem",
              width: "100%",
              textAlign: "center",
              color: "#FF3B30",
            }}
          >
            <p style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Failed to load offer</p>
            <p style={{ fontSize: "13px", opacity: 0.9 }}>
              {error instanceof Error ? error.message : "An error occurred while fetching the campaign offer."}
            </p>
            <button
              onClick={() => refetch()}
              style={{
                marginTop: "1rem",
                padding: "8px 16px",
                borderRadius: "8px",
                backgroundColor: "#FF3B30",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "13px",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {data && !isLoading && (
          <div
            style={{
              width: "100%",
              backgroundColor: "rgba(25, 25, 25, 0.7)",
              borderRadius: "16px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <h2 style={{ fontSize: "18px", color: "#FAAF3F", fontWeight: "600" }}>Offer Payload</h2>
            <pre
              style={{
                backgroundColor: "#050505",
                padding: "1rem",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#00FF66",
                overflowX: "auto",
                maxHeight: "400px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}