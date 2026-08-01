"use client";

import { useEffect, useState } from "react";
import { getAppConfig, isConfigLoaded } from "@/lib/config/app.config";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { useConsentStatus } from "@/lib/consent/useConsentStatus";

// Custom helper hook for online status
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

export function StatusLine() {
  const isOnline = useOnlineStatus();
  const { isAppReady } = useBootstrap();
  const { canTrack } = useConsentStatus();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Never show StatusLine in production
  const isProd = process.env.NEXT_PUBLIC_ENV_TYPE === "prod";
  if (isProd) return null;

  // Get env type ("stage" or "prod")
  let envType = "STAGE";
  try {
    if (isConfigLoaded()) {
      envType = getAppConfig().envType.toUpperCase();
    } else {
      envType = (process.env.NEXT_PUBLIC_ENV_TYPE || "STAGE").toUpperCase();
    }
  } catch {
    envType = (process.env.NEXT_PUBLIC_ENV_TYPE || "STAGE").toUpperCase();
  }

  const isDev = process.env.NODE_ENV === "development";
  const envDisplay = isDev 
    ? "DEBUG BUILD" 
    : envType === "PROD" 
      ? "PRODUCTION BUILD" 
      : "STAGE BUILD";

  // Check Razorpay status
  const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY;
  const isRazorpayLive = razorpayKey ? razorpayKey.startsWith("rzp_live") : (envType === "PROD");
  const razorpayDisplay = isRazorpayLive ? "LIVE" : "TEST";

  // Check Analytics status
  const activeProviders: string[] = [];
  if (process.env.NEXT_PUBLIC_ENABLE_CLEVERTAP === "true") activeProviders.push("CleverTap");
  if (process.env.NEXT_PUBLIC_ENABLE_FIREBASE === "true") activeProviders.push("Firebase");
  if (process.env.NEXT_PUBLIC_ENABLE_BACKEND_ANALYTICS === "true") activeProviders.push("Backend");
  if (process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_PIXEL === "true") activeProviders.push("FB Pixel");

  const analyticsDisplay = canTrack
    ? `ENABLED${activeProviders.length > 0 ? ` (${activeProviders.join(", ")})` : ""}`
    : "DISABLED";

  // Pure inline styling to support Vanilla CSS environments
  const containerStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    height: "28px",
    zIndex: 99999,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: "16px",
    paddingRight: "16px",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#a3a3a3",
    userSelect: "none",
    pointerEvents: "none",
    background: "rgba(10, 10, 10, 0.85)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
  };

  const leftSectionStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: "bold",
    color: "rgba(255, 255, 255, 0.9)",
  };

  const blueDotStyle: React.CSSProperties = {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#3b82f6",
  };

  const rightSectionStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  };

  const loggerBlockStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };

  const getStatusTextStyle = (isActive: boolean, colorType: "emerald" | "rose" | "amber" | "neutral" = "emerald"): React.CSSProperties => {
    let color = "#10b981"; // Default emerald
    if (!isActive) {
      if (colorType === "rose") color = "#f43f5e";
      else if (colorType === "amber") color = "#f59e0b";
      else color = "#737373"; // Neutral-500
    } else {
      if (colorType === "emerald") color = "#34d399";
      else if (colorType === "amber") color = "#fbbf24";
    }
    return {
      color,
      fontWeight: "bold",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    };
  };

  const getDotStyle = (isActive: boolean, colorType: "emerald" | "rose" | "amber" | "neutral" = "emerald"): React.CSSProperties => {
    let backgroundColor = "#10b981"; // Default emerald
    if (!isActive) {
      if (colorType === "rose") backgroundColor = "#f43f5e";
      else if (colorType === "amber") backgroundColor = "#f59e0b";
      else backgroundColor = "#737373"; // Neutral-500
    } else {
      if (colorType === "emerald") backgroundColor = "#34d399";
      else if (colorType === "amber") backgroundColor = "#fbbf24";
    }
    return {
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      backgroundColor,
    };
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes statusLinePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .status-line-pulse {
          animation: statusLinePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}} />
      <div style={containerStyle}>
        {/* Left side: Build name */}
        <div style={leftSectionStyle}>
          <span className="status-line-pulse" style={blueDotStyle} />
          <span>{envDisplay}</span>
        </div>

        {/* Right side: Logger states */}
        <div style={rightSectionStyle}>
          {/* Network Connection Logger */}
          <div style={loggerBlockStyle}>
            <span>NETWORK:</span>
            <span style={getStatusTextStyle(isOnline, isOnline ? "emerald" : "rose")}>
              <span style={getDotStyle(isOnline, isOnline ? "emerald" : "rose")} />
              {isOnline ? "CONNECTED" : "DISCONNECTED"}
            </span>
          </div>

          {/* Razorpay Credentials status */}
          <div style={loggerBlockStyle}>
            <span>RAZORPAY:</span>
            <span style={getStatusTextStyle(isRazorpayLive, isRazorpayLive ? "emerald" : "amber")}>
              <span style={getDotStyle(isRazorpayLive, isRazorpayLive ? "emerald" : "amber")} />
              {razorpayDisplay}
            </span>
          </div>

          {/* Analytics status */}
          <div style={loggerBlockStyle}>
            <span>ANALYTICS:</span>
            <span style={getStatusTextStyle(canTrack, canTrack ? "emerald" : "neutral")}>
              <span style={getDotStyle(canTrack, canTrack ? "emerald" : "neutral")} />
              {analyticsDisplay}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
