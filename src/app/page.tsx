"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  JojoLogo,
  NoAdsIcon,
  DevicesIcon,
  ExclusiveIcon,
  HdIcon,
} from "@/components/Icons";
import { FreeTrialForm } from "@/components/FreeTrialForm";
import { OtpVerification } from "@/components/OtpVerification";
import { SuccessScreen } from "@/components/SuccessScreen";
import { GoldRestrictionModal } from "@/components/GoldRestrictionModal";
import api from "../utils/apiClient";
import { getUserGeoLocation } from "../utils/userUtil";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { useAuthStore } from "@/store/useAuthStore";
import { initiateOtpFlow, completeOtpVerification } from "@/features/auth/services/auth.service";
import { useGetCountries } from "@/features/auth/hooks/useOtpLogin";
import footerData from "@/lib/data/footer.data.json";
import { logger } from "@/lib/logger/logger";
import { AppConfig } from "@/lib/config/app.config";

/** Map each platform id → the SVG asset filename */
const SOCIAL_ICON_MAP: Record<string, string> = {
  facebook: "/assets/facebook.svg",
  instagram: "/assets/instagram.svg",
  youtube: "/assets/youtube.svg",
  linkdin: "/assets/linkdin.svg", // currently twitter.svg is used for LinkedIn slot
};

export default function Home() {
  const router = useRouter();
  const { isAppReady } = useBootstrap();
  const { data: countries = [] } = useGetCountries();
  logger.info("countries", countries)

  // Extract and log special offer plan data
  const specialOffer = AppConfig.specialOfferPlan;
  console.log("Special Offer Plan Data:", specialOffer);
  logger.info("[Home] Special Offer Plan Data:", specialOffer);

  const subscriptionGroup = specialOffer?.oSubscriptionGroup;
  const product = subscriptionGroup?.aSubscriptionProducts?.[0];
  const offer = product?.oOfferDetails;
  const offerTranslation = offer?.oOfferTranslation;
  const features = product?.aFeatures || [];
  const pricing = product?.aProviderSkus?.[0]?.oPricing;

  // Title: "Free TRIAL" or dynamic bottom line text / title
  const pageTitle = offerTranslation?.oOfferHeadline?.sBottomLineText || "";

  // Badge: "For 7 days" or dynamic top line text / tagName
  const badgeText = offerTranslation?.oOfferHeadline?.sTopLineText || "";

  // Confirm Button Label
  const confirmButtonLabel = offerTranslation?.sConfirmButtonLabel || "";

  // Formatted Short Disclaimer
  const disclaimerTemplate = offerTranslation?.sOfferDisclaimer;
  const currencySymbol = pricing?.sCurrencySymbol || "₹";
  const productPrice = pricing?.nPrice !== undefined ? pricing.nPrice : "499";
  const disclaimerText = disclaimerTemplate
    ? disclaimerTemplate
      .replace("{sCurrencySymbol}", currencySymbol)
      .replace("{nPrice}", productPrice.toString())
      .replace("/yearly", "/year")
      .replace("/years", "/year")
    : "";

  // Long Footer Note
  const footerNote = offerTranslation?.sFooterNote || "";

  const activeFeatures = features;

  const getFeatureIcon = (featureType: string, uid: string) => {
    switch (featureType) {
      case "AD_INVIDEO":
        return <NoAdsIcon uid={uid} />;
      case "STREAM_LIMIT":
        return <DevicesIcon />;
      case "CONTENT_SVOD_ONLY":
        return <ExclusiveIcon />;
      case "MAX_VIDEO_QUALITY":
        return <HdIcon uid={uid} />;
      default:
        return null;
    }
  };

  const [step, setStep] = useState<"input" | "otp" | "success">("input");
  const [contactInfo, setContactInfo] = useState("");
  const [parsedPhone, setParsedPhone] = useState("");
  const [parsedPhoneCode, setParsedPhoneCode] = useState("");
  const [isExists, setIsExists] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goldSubscriptionInfo, setGoldSubscriptionInfo] = useState<any>(null);
  const [showGoldPopup, setShowGoldPopup] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);

  const handleInputSubmit = async (contact: string) => {
    setError(null);
    setIsVerifying(true);

    const isEmail = contact.includes("@");
    let phone = contact.trim();
    let phoneCode = "";

    if (!isEmail) {
      if (phone.startsWith("+")) {
        const clean = phone.substring(1).replace(/\D/g, ""); // e.g. "918460139822"
        let bestMatchCode = "";
        let bestMatchLength = 0;

        const codesToCheck = countries.length > 0
          ? countries.map((c) => c.phoneCode.replace(/\D/g, ""))
          : ["91", "1", "44", "971", "61", "65", "60", "966", "965", "968", "973", "974", "92", "880", "977", "94", "254"];

        for (const code of codesToCheck) {
          if (clean.startsWith(code) && code.length > bestMatchLength) {
            bestMatchCode = code;
            bestMatchLength = code.length;
          }
        }

        if (bestMatchLength > 0) {
          phoneCode = `+${bestMatchCode}`;
          phone = clean.substring(bestMatchLength);
        } else {
          // Fallback if no matching code is found
          const match = phone.match(/^\+(\d{1,3})(.*)$/);
          if (match) {
            phoneCode = `+${match[1]}`;
            phone = match[2].replace(/\D/g, "");
          }
        }
      } else {
        const clean = phone.replace(/\D/g, "");
        phoneCode = "+91"; // Default to India country code
        phone = clean;
      }
    }

    try {
      const result = await initiateOtpFlow(phone, phoneCode);
      setContactInfo(contact);
      setParsedPhone(phone);
      setParsedPhoneCode(phoneCode);
      setIsExists(result.isExists);
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please check your credentials and try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpSubmit = async (otpCode: string) => {
    setError(null);
    setIsVerifying(true);

    try {
      const response = await completeOtpVerification(
        parsedPhone,
        parsedPhoneCode,
        otpCode,
        !isExists
      );

      console.log("[OTP] Verification response:", response);

      const user = {
        id: response.user_id,
        phone: response.phone || "",
        email: response.email || "",
        isGuest: false,
        createdAt: new Date().toISOString(),
      };

      setAuth(user, response.session_id, "");

      // Save plain keys needed by usePaymentHandler (it reads "session_id" and "user_id" directly)
      if (response.session_id) localStorage.setItem("session_id", response.session_id);
      if (response.user_id) localStorage.setItem("user_id", response.user_id);
      
      // Save userData in localStorage
      localStorage.setItem("userData", JSON.stringify(user));

      // Determine if logged in via email or phone
      const isEmail = (response.email || contactInfo || parsedPhone || "").includes("@");
      if (!isEmail) {
        const phoneNum = response.phone || parsedPhone || "";
        const phoneCodeNum = response.phone_code || parsedPhoneCode || "";
        if (phoneNum) {
          localStorage.setItem("user_phone", phoneNum);
        }
        if (phoneCodeNum) {
          localStorage.setItem("user_phone_code", phoneCodeNum);
        }
      } else {
        localStorage.removeItem("user_phone");
        localStorage.removeItem("user_phone_code");
      }

      if (specialOffer) sessionStorage.setItem("selectedPlan", JSON.stringify(specialOffer));

      // Check if the user has an active Gold (SVOD) subscription
      let isGoldUser = false;
      try {
        const geoData = getUserGeoLocation();
        const subResponse = await api.post("subscription/verify-subscription", {
          countryCode: geoData?.country_code || "IN"
        }, {
          headers: { sessionid: response.session_id }
        });
        
        console.log("[Verify Subscription] Response:", subResponse.data);
        
        const subData = subResponse.data?.data;
        if (subData?.planType === "SVOD") {
          isGoldUser = true;
          setGoldSubscriptionInfo(subData.subscription || { plan_name: "JOJO Gold Premium" });
          setShowGoldPopup(true);
          setIsVerifying(false);
          handleReset();
        }
      } catch (subErr) {
        console.error("Failed to verify subscription status:", subErr);
      }

      if (!isGoldUser) {
        console.log("[OTP] Navigating to /payment...");
        // Use hard navigation to guarantee route change (router.push can be blocked mid-render)
        window.location.href = "/payment";
      }
    } catch (err: any) {
      console.error("[OTP] Verification error:", err);
      setError(err.message || "Invalid OTP code. Please try again.");
      setIsVerifying(false);
    }
  };

  const handleBack = () => {
    setError(null);
    setStep("input");
  };

  const handleReset = () => {
    setError(null);
    setStep("input");
    setContactInfo("");
    setParsedPhone("");
    setParsedPhoneCode("");
    setIsExists(false);
  };

  const handleResendOtp = async () => {
    setError(null);
    setIsVerifying(true);

    try {
      await initiateOtpFlow(parsedPhone, parsedPhoneCode);
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isAppReady) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0c0b0a",
          color: "#ffffff",
          zIndex: 9999,
        }}
      >
        <div className="premium-loader" />
        <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>Loading settings...</p>
      </div>
    );
  }

  return (
    <>
      <main className="app-container">
        {/* 1. MOBILE VIEW (Visible on screens < 768px) */}
        <div className="mobile-only" style={{ width: "100%" }}>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Movie Posters Banner */}
            <div className="posters-banner-container">
              <img
                src="/assets/posters_mobile.png"
                alt="Movie Posters"
                className="posters-banner-image"
              />
              <div className="posters-banner-mask" />
            </div>

            {/* Top Header Logo */}
            <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "center", width: "100%" }}>
              <JojoLogo />
            </header>

            {/* Header Title Section & Tab Badge */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2.5rem" }}>
              <h1
                className="gold-text-gradient"
                style={{
                  fontSize: "44px",
                  fontWeight: "900",
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  textAlign: "center",
                  margin: 0,
                  lineHeight: "48px",
                }}
              >
                {pageTitle || ""}
              </h1>
              <div style={{ width: "231px", display: "flex", flexDirection: "column", alignItems: "center", marginTop: "6px" }}>
                <div style={{ width: "100%", height: "1px", backgroundColor: "rgba(255, 225, 174, 0.15)" }} />
                <div
                  className="gold-bg-gradient"
                  style={{
                    color: "#050505",
                    fontSize: "16px",
                    fontWeight: "700",
                    width: "fit-content",
                    padding: "0 16px",
                    height: "34px",
                    borderRadius: "0 0 16px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  {badgeText}
                </div>
              </div>
            </div>

            {/* Benefits Grid */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                marginBottom: "2.5rem",
                gap: "8px",
              }}
            >
              {activeFeatures.map((feature: any) => (
                <div key={feature.sFeatureId || feature.sFeatureName} className="feature-card-mobile">
                  {getFeatureIcon(feature.eFeatureType, "mobile") || (
                    <img src={feature.sFeatureImageUrl} alt={feature.sFeatureName} style={{ width: "32px", height: "32px" }} />
                  )}
                  <span
                    className="gold-text-gradient"
                    style={{
                      fontSize: "10px",
                      fontWeight: "600",
                      textAlign: "center",
                      lineHeight: "1.3",
                    }}
                  >
                    {feature.sFeatureName}
                  </span>
                </div>
              ))}
            </div>

            {/* Form Step Wrapper */}
            <div style={{ width: "100%" }}>
              {error && (
                <div style={{ color: "#ff4a4a", fontSize: "14px", marginBottom: "1.5rem", width: "100%", textAlign: "center", fontWeight: "500" }}>
                  {error}
                </div>
              )}
              {isVerifying ? (
                <div
                  className="fade-in"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "200px",
                  }}
                >
                  <div className="premium-loader" />
                  <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>Verifying OTP...</p>
                </div>
              ) : step === "input" ? (
                <FreeTrialForm
                  onSubmit={handleInputSubmit}
                  confirmButtonLabel={confirmButtonLabel}
                  disclaimerText={disclaimerText}
                  footerNote={footerNote}
                />
              ) : (
                <OtpVerification
                  contactInfo={contactInfo}
                  onSubmit={handleOtpSubmit}
                  onBack={handleBack}
                  onResend={handleResendOtp}
                  disclaimerText={disclaimerText}
                />
              )}
            </div>
          </div>
        </div>

        {/* 2. DESKTOP VIEW (Visible on screens >= 768px) */}
        <div className="desktop-only" style={{ width: "100%" }}>
          {/* Movie Posters Banner */}
          <div className="posters-banner-container">
            <img
              src="/assets/posters_desktop.png"
              alt="Movie Posters"
              className="posters-banner-image"
            />
            <div className="posters-banner-mask" />
          </div>

          {/* Top Header Logo */}
          <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "center", width: "100%" }}>
            <JojoLogo />
          </header>

          {/* Header Title Section & Tab Badge */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "3.5rem" }}>
            <h1
              className="gold-text-gradient"
              style={{
                fontSize: "44px",
                fontWeight: "900",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                textAlign: "center",
                margin: 0,
                lineHeight: "48px",
              }}
            >
              {pageTitle || ""}
            </h1>
            <div style={{ width: "231px", display: "flex", flexDirection: "column", alignItems: "center", marginTop: "6px" }}>
              <div style={{ width: "100%", height: "1px", backgroundColor: "rgba(255, 225, 174, 0.15)" }} />
              <div
                className="gold-bg-gradient"
                style={{
                  color: "#050505",
                  fontSize: "16px",
                  fontWeight: "700",
                  width: "fit-content",
                  padding: "0 16px",
                  height: "34px",
                  borderRadius: "0 0 16px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {badgeText || ""}
              </div>
            </div>
          </div>

          {/* Web Split Columns Layout */}
          <div className="web-split-layout">
            {/* Left Column (50%): Form actions, Pricing, Disclaimer */}
            <div className="web-layout-left">
              <div style={{ width: "100%" }}>
                {error && (
                  <div style={{ color: "#ff4a4a", fontSize: "14px", marginBottom: "1.5rem", width: "100%", textAlign: "left", fontWeight: "500" }}>
                    {error}
                  </div>
                )}
                {isVerifying ? (
                  <div
                    className="fade-in"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "150px",
                      width: "100%"
                    }}
                  >
                    <div className="premium-loader" />
                    <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>Verifying OTP...</p>
                  </div>
                ) : step === "input" ? (
                  <FreeTrialForm
                    onSubmit={handleInputSubmit}
                    confirmButtonLabel={confirmButtonLabel}
                    disclaimerText={disclaimerText}
                    footerNote={footerNote}
                  />
                ) : (
                  <OtpVerification
                    contactInfo={contactInfo}
                    onSubmit={handleOtpSubmit}
                    onBack={handleBack}
                    onResend={handleResendOtp}
                    disclaimerText={disclaimerText}
                  />
                )}
              </div>
            </div>

            {/* Right Column (50%): Gold Features Separator & 2x2 Feature Grid */}
            <div className="web-layout-right">
              <div className="web-features-header">
                <div className="web-features-header-line" />
                <span className="web-features-header-text gold-text-gradient">GOLD FEATURES</span>
                <div className="web-features-header-line" />
              </div>

              <div className="web-features-grid">
                {activeFeatures.map((feature: any) => (
                  <div key={feature.sFeatureId || feature.sFeatureName} className="feature-card">
                    {getFeatureIcon(feature.eFeatureType, "desktop") || (
                      <img src={feature.sFeatureImageUrl} alt={feature.sFeatureName} style={{ width: "32px", height: "32px" }} />
                    )}
                    <span className="gold-text-gradient" style={{ fontSize: "12px", fontWeight: "600", textAlign: "center" }}>
                      {feature.sFeatureName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer links at the bottom */}
          <footer className="web-footer-container">
            <div className="web-footer-grid">
              <div className="web-footer-column">
                <span className="web-footer-link">FAQs</span>
                <span className="web-footer-link">Terms & Conditions</span>
                <span className="web-footer-link">Privacy Policy</span>
                <div style={{ marginTop: "1rem" }}>
                  <img
                    src="/assets/plain_logo.svg"
                    alt="JOJO Logo"
                    style={{ width: "93px", height: "30px", display: "block" }}
                  />
                </div>
              </div>

              <div className="web-footer-column">
                <span className="web-footer-link">Advertise with us</span>
                <span className="web-footer-link">Contact Us</span>
                <span className="web-footer-link">Help & Support</span>
                <span className="web-footer-link">Assets</span>
                <span className="web-footer-link">Careers</span>
              </div>

              <div className="web-footer-column" style={{ alignItems: "flex-end", textAlign: "right" }}>
                <span style={{ color: "var(--text-footer)", marginBottom: "0.5rem", fontWeight: 400 }}>Follow us for more updates</span>
                <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem" }}>
                  {footerData.social.platforms.map((platform) => {
                    const iconSrc = SOCIAL_ICON_MAP[platform.id];
                    if (!iconSrc || !platform.href) return null;
                    return (
                      <a
                        key={platform.id}
                        href={platform.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={platform.label}
                      >
                        <img
                          src={iconSrc}
                          alt={platform.label}
                          style={{ width: "32px", height: "32px", cursor: "pointer" }}
                        />
                      </a>
                    );
                  })}
                </div>

                <span style={{ color: "var(--text-footer)", marginBottom: "0.5rem", fontWeight: 400 }}>Download the JOJO app</span>
                <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem" }}>
                  {/* Google Play Button */}
                  <div
                    style={{
                      backgroundColor: "#e2e2e2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "6px 10px",
                      borderRadius: "4px",
                      height: "37px",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
                      <img src="/assets/google_play_logo.png" alt="Google Play Icon" style={{ width: "21px", height: "22px" }} />
                      <img src="/assets/google_play_text.svg" alt="Google Play Store" style={{ width: "76.7px", height: "23.5px" }} />
                    </div>
                  </div>
                  {/* App Store Button */}
                  <div
                    style={{
                      backgroundColor: "var(--text-footer)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "6px 10px",
                      borderRadius: "4px",
                      height: "37px",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
                      <img src="/assets/apple_logo.svg" alt="Apple Icon" style={{ width: "19.3px", height: "22.6px" }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px", justifyContent: "center" }}>
                        <img src="/assets/apple_text_line1.svg" alt="Download on the" style={{ width: "72.6px", height: "6.4px" }} />
                        <img src="/assets/apple_text_line2.svg" alt="App Store" style={{ width: "78.8px", height: "15.6px" }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "1rem", justifyContent: "flex-end" }}>
                  <img src="/assets/copyright.svg" alt="Copyright Icon" style={{ width: "14px", height: "14px" }} />
                  <span style={{ fontSize: "12px", color: "var(--text-footer)", fontWeight: 400 }}>
                    2025 All the Copyrights Reserved to JOJO Limited
                  </span>
                </div>
              </div>
            </div>
          </footer>
        </div>

        {/* Unified Success State Overlay Modal - outside main so fixed covers full viewport */}
      </main>
      {step === "success" && (
        <div className="success-overlay">
          <SuccessScreen onReset={handleReset} />
        </div>
      )}

      {showGoldPopup && (
        <div className="success-overlay">
          <GoldRestrictionModal
            subscription={goldSubscriptionInfo}
            onClose={() => {
              setShowGoldPopup(false);
              handleReset();
            }}
          />
        </div>
      )}
    </>
  );
}
