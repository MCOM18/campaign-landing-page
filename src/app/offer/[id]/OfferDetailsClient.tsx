"use client";

import { use, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Lottie from "lottie-react";
import toast from "react-hot-toast";
import { JojoLogo, NoAdsIcon, DevicesIcon, ExclusiveIcon, HdIcon } from "@/components/Icons";
import { FreeTrialForm } from "@/components/FreeTrialForm";
import { OtpVerification } from "@/components/OtpVerification";
import { GoldRestrictionModal } from "@/components/GoldRestrictionModal";
import { useOfferByCampaign } from "@/features/offer/hooks/useOfferByCampaign";
import { validateCode } from "@/features/offer/api/validateCode";
import { initiateOtpFlow, completeOtpVerification } from "@/features/auth/services/auth.service";
import { useGetCountries } from "@/features/auth/hooks/useOtpLogin";
import { REGEX } from "@/lib/constants/regex";
import { useAuthStore } from "@/store/useAuthStore";
import { appConfig } from "@/lib/config/app.config";
import { getUserGeoLocation } from "@/utils/userUtil";
import { logger } from "@/lib/logger/logger";
import api from "@/utils/apiClient";
import SubscriptionPlanCard from "@/app/payment/SubscriptionPlanCard";
import Footer from "@/components/Footer";
import thumbnailsJson from "../../../../public/assets/json/THUMBNAILS SCROLL ANIMATION.json";
import {
  FiCalendar,
  FiInfo,
  FiShield,
  FiChevronDown,
  FiZap,
  FiMaximize,
} from "react-icons/fi";

interface OfferDetailsClientProps {
  params: Promise<{ id: string }>;
}

const getCampaignIdFromPath = (
  resolvedParams?: { id?: string } | null,
  routeParams?: any
): string => {
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;
    const segments = pathname.split("/").filter(Boolean);
    const offerIndex = segments.indexOf("offer");
    if (offerIndex !== -1 && segments[offerIndex + 1]) {
      const urlId = decodeURIComponent(segments[offerIndex + 1]).replace(/\.html$/, "");
      if (urlId && urlId !== "default") {
        return urlId;
      }
    }
  }
  const paramId = (resolvedParams?.id || routeParams?.id || "") as string;
  // Do not return the static placeholder — wait for real ID
  return paramId !== "default" ? paramId : "";
};

export default function OfferDetailsClient({ params }: OfferDetailsClientProps) {
  const router = useRouter();
  const routeParams = useParams();
  const resolvedParams = params ? use(params) : null;

  const [campaignId, setCampaignId] = useState<string>(() =>
    getCampaignIdFromPath(resolvedParams, routeParams)
  );

  useEffect(() => {
    const activeId = getCampaignIdFromPath(resolvedParams, routeParams);
    if (activeId && activeId !== campaignId) {
      setCampaignId(activeId);
    }
  }, [resolvedParams, routeParams, campaignId]);

  // On mount, also read the real campaign ID from window.location in case
  // params resolved as "default" during static generation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pathId = getCampaignIdFromPath(null, null);
    if (pathId && pathId !== campaignId) {
      setCampaignId(pathId);
    }
  }, []);

  const searchParams = useSearchParams();
  const [sCouponCode, setSCouponCode] = useState<string>("");
  const [couponInput, setCouponInput] = useState<string>("");

  useEffect(() => {
    const fromParams = searchParams?.get("sCouponCode") || "";
    const fromStorage = typeof window !== "undefined" ? localStorage.getItem("sCouponCode") || "" : "";
    const effectiveCode = fromParams || fromStorage;
    setSCouponCode(effectiveCode);
    setCouponInput(effectiveCode);
  }, [searchParams]);

  const { data, isLoading, isError, error, refetch } = useOfferByCampaign(campaignId, sCouponCode);

  const lottieMobileRef = useRef<any>(null);
  const lottieDesktopRef = useRef<any>(null);

  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number>(0);
  const [showTerms, setShowTerms] = useState<boolean>(false);

  // Auth flow states for payment initiation
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authStep, setAuthStep] = useState<"input" | "otp" | "verifying">("input");
  const [contactInfo, setContactInfo] = useState<string>("");
  const [parsedPhone, setParsedPhone] = useState<string>("");
  const [parsedPhoneCode, setParsedPhoneCode] = useState<string>("");
  const [isExists, setIsExists] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [goldSubscriptionInfo, setGoldSubscriptionInfo] = useState<any>(null);
  const [showGoldPopup, setShowGoldPopup] = useState<boolean>(false);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState<boolean>(false);

  const { data: countries = [] } = useGetCountries();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    if (campaignId) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pending_campaign_id", campaignId);
      }
      logger.info(`[OfferDetailsClient] Loaded offer details page for campaignId: ${campaignId}`);
    }
  }, [campaignId]);

  // Extract nested API data
  // API client returns: { metaData, data: <decryptedPayload> }
  // decryptedPayload may itself be: { data: { offerDetails, campaignDetails, aAllSubscriptionPlans } }
  // or directly: { offerDetails, campaignDetails, aAllSubscriptionPlans }
  const offerData = data?.data?.data || data?.data || data || {};
  const offerDetails = offerData?.offerDetails || {};
  const campaignDetails = offerData?.campaignDetails || {};
  const metadata = campaignDetails?.metadata || {};
  const subscriptionPlansGroup = offerData?.aAllSubscriptionPlans || [];

  const discountVal = offerDetails?.discountValue || 0;
  const offerType = offerDetails?.offerType || "PERCENTAGE_DISCOUNT";
  const campaignRefId = campaignDetails?.campaignRefId || campaignId;

  // Extract dynamic theme color from API response (use dark theme)
  const themeColor = metadata?.theme?.backgroundColor?.dark || "#310A6C";

  const parseHtmlListItems = (htmlStr: string): string[] => {
    if (!htmlStr) return [];
    try {
      const liMatches = htmlStr.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
      if (liMatches && liMatches.length > 0) {
        return liMatches.map((item) =>
          item
            .replace(/<li[^>]*>/gi, "")
            .replace(/<\/li>/gi, "")
            .replace(/<[^>]+>/g, "")
            .trim()
        );
      }
    } catch (e) {
      logger.warn("[OfferDetailsClient] Error parsing HTML list:", e);
    }
    return [htmlStr.replace(/<[^>]+>/g, "").trim()];
  };

  const termsList = parseHtmlListItems(metadata?.termsAndConditions || "");

  // Map subscription plans directly using calculated discounts from provider SKU / oCouponDetails
  const flatPlansList = (subscriptionPlansGroup || []).flatMap((group: any) =>
    (group?.aSubscriptionProducts || []).map((prod: any) => {
      const sku = prod?.aProviderSkus?.[0] || {};
      const couponDetails = sku?.oCouponDetails || {};

      const origPrice =
        couponDetails?.nOriginalPrice ?? sku?.oPricing?.nPrice ?? 499;

      let finalPrice = origPrice;
      if (couponDetails?.nFinalAmount !== undefined && couponDetails?.nFinalAmount !== null) {
        finalPrice = couponDetails.nFinalAmount;
      } else if (offerType === "PERCENTAGE_DISCOUNT" && discountVal > 0) {
        finalPrice = Math.round(origPrice * (1 - discountVal / 100));
      } else if (offerType === "FLAT_DISCOUNT" && discountVal > 0) {
        finalPrice = Math.max(0, origPrice - discountVal);
      }

      const symbol =
        couponDetails?.sCurrencySymbol || sku?.oPricing?.sCurrencySymbol || "₹";

      const discountLabel =
        couponDetails?.sSavingsLabel ||
        (couponDetails?.nDiscountPercentage ? `${couponDetails.nDiscountPercentage}% OFF` : null) ||
        (discountVal > 0 ? `${discountVal}% OFF` : null);

      const modifiedSku = {
        ...sku,
        oPricing: {
          ...(sku?.oPricing || {}),
          nPrice: finalPrice,
          sCurrencySymbol: symbol,
        },
      };

      return {
        uniqueKey: prod.sProductId || sku?.sUniqueSkuId || "plan",
        plan: {
          ...prod,
          providerSku: modifiedSku,
          sFormattedPrice: `${symbol}${finalPrice}`,
          sAltPrice: `${symbol}${finalPrice}`,
          sOriginalPrice: finalPrice < origPrice ? `${symbol}${origPrice}` : null,
          nOriginalPrice: origPrice,
          sDiscount: discountLabel,
          nValidity: prod.nValidityDays || 365,
          aFeatures: prod.aFeatures || [],
        },
        originalPrice: origPrice,
        finalPrice,
        currencySymbol: symbol,
      };
    })
  );

  const selectedPlanObj = flatPlansList[selectedPlanIndex] || flatPlansList[0];

  // Active features list (fallback to standard 4 JOJO Gold features if empty)
  const activeFeatures: any[] =
    selectedPlanObj?.plan?.aFeatures?.length > 0
      ? selectedPlanObj.plan.aFeatures
      : [];

  const checkIsLoggedIn = () => {
    if (isAuthenticated) return true;
    if (typeof window !== "undefined") {
      const sessionId = localStorage.getItem("session_id");
      const userId = localStorage.getItem("user_id");
      return Boolean(sessionId && userId);
    }
    return false;
  };

  const handleRedeemClick = () => {
    if (selectedPlanObj?.plan) {
      localStorage.setItem("selectedPlan", JSON.stringify(selectedPlanObj.plan));
    }
    const enteredCoupon = (couponInput || sCouponCode || "").trim();
    localStorage.setItem("sCouponCode", enteredCoupon);
    const codeToSave = campaignRefId || campaignId || "";
    if (codeToSave) {
      sessionStorage.setItem("pending_campaign_id", codeToSave);
    }

    if (checkIsLoggedIn()) {
      router.push("/payment");
    } else {
      setShowAuthModal(true);
      setAuthStep("input");
      setAuthError(null);
    }
  };

  const handleInputSubmit = async (contact: string) => {
    setAuthError(null);
    setAuthStep("verifying");

    const isEmail = contact.includes("@");
    let phone = contact.trim();
    let phoneCode = "";

    if (!isEmail) {
      if (phone.startsWith("+")) {
        const clean = phone.substring(1).replace(/\D/g, "");
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
          const match = phone.match(REGEX.COUNTRY_CODE_SPLIT);
          if (match) {
            phoneCode = `+${match[1]}`;
            phone = match[2].replace(REGEX.NON_DIGIT, "");
          }
        }
      } else {
        const clean = phone.replace(REGEX.NON_DIGIT, "");
        phoneCode = appConfig.DEFAULT_MOBILE_NUMBER_CODE;
        phone = clean;
      }
    }

    try {
      const result = await initiateOtpFlow(phone, phoneCode);
      setContactInfo(contact);
      setParsedPhone(phone);
      setParsedPhoneCode(phoneCode);
      setIsExists(result.isExists);
      setAuthStep("otp");
    } catch (err: any) {
      setAuthError(err.message || "Failed to send OTP. Please check your credentials and try again.");
      setAuthStep("input");
    }
  };

  const handleOtpSubmit = async (otpCode: string) => {
    setAuthError(null);
    setAuthStep("verifying");

    const safetyTimeout = setTimeout(() => {
      setAuthStep("otp");
      setAuthError("Verification took too long. Please try again.");
    }, 15000);

    try {
      const geoData = getUserGeoLocation();
      const response = await completeOtpVerification(
        parsedPhone,
        parsedPhoneCode,
        otpCode,
        !isExists,
        undefined,
        geoData?.country_code || undefined,
        geoData?.region || undefined,
        geoData?.city || undefined
      );

      const user = {
        id: response.user_id,
        phone: response.phone || "",
        email: response.email || "",
        isGuest: false,
        createdAt: new Date().toISOString(),
      };

      setAuth(user, response.session_id, "");

      if (response.session_id) localStorage.setItem("session_id", response.session_id);
      if (response.user_id) localStorage.setItem("user_id", response.user_id);
      localStorage.setItem("userData", JSON.stringify(user));

      const isEmailLogin = (response.email || contactInfo || parsedPhone || "").includes("@");
      if (!isEmailLogin) {
        const phoneNum = response.phone || parsedPhone || "";
        const phoneCodeNum = response.phone_code || parsedPhoneCode || "";
        if (phoneNum) localStorage.setItem("user_phone", phoneNum);
        if (phoneCodeNum) localStorage.setItem("user_phone_code", phoneCodeNum);
      } else {
        localStorage.removeItem("user_phone");
        localStorage.removeItem("user_phone_code");
      }

      try {
        if (otpCode) useAuthStore.getState().setLoginOtp(otpCode);
      } catch (err) {
        logger.error("[OTP] Error in updating auth store with OTP", err);
      }

      let isGoldUser = false;
      try {
        const geoDataVerify = getUserGeoLocation();
        const payloadVerify = { countryCode: geoDataVerify?.country_code || "IN" };
        const headersVerify = { sessionid: response.session_id };

        logger.info("[Verify Subscription] Request:", { payload: payloadVerify, headers: headersVerify });

        const subResponse = await api.post("subscription/verify-subscription", payloadVerify, {
          headers: headersVerify
        });

        logger.info("[Verify Subscription] Response:", subResponse.data);

        const subData = subResponse.data?.data;
        if (subData?.planType === "SVOD") {
          isGoldUser = true;
          setGoldSubscriptionInfo(subData.subscription || { plan_name: "JOJO Gold Premium" });
          setShowGoldPopup(true);
          setShowAuthModal(false);
          handleReset();
        }
      } catch (subErr) {
        logger.error("[Verify Subscription] Failed to verify subscription status:", subErr);
      }

      if (!isGoldUser) {
        setShowAuthModal(false);
        toast.success("Authentication successful! Redirecting to payment...");

        if (selectedPlanObj?.plan) {
          localStorage.setItem("selectedPlan", JSON.stringify(selectedPlanObj.plan));
        }
        const codeToSave = campaignRefId || campaignId || "";
        if (codeToSave) {
          sessionStorage.setItem("pending_campaign_id", codeToSave);
        }
        router.push("/payment");
      }
      clearTimeout(safetyTimeout);
    } catch (err: any) {
      clearTimeout(safetyTimeout);
      setAuthError(err.message || "Verification failed. Please check the code and try again.");
      setAuthStep("otp");
    }
  };

  const handleReset = () => {
    setAuthError(null);
    setAuthStep("input");
    setContactInfo("");
    setParsedPhone("");
    setParsedPhoneCode("");
    setIsExists(false);
  };

  const handleResendOtp = async () => {
    setAuthError(null);
    setAuthStep("verifying");

    try {
      await initiateOtpFlow(parsedPhone, parsedPhoneCode);
    } catch (err: any) {
      setAuthError(err.message || "Failed to resend OTP. Please check your credentials and try again.");
    } finally {
      setAuthStep("otp");
    }
  };

  const handleApplyCoupon = async () => {
    const codeToApply = couponInput.trim();
    if (!codeToApply) {
      toast.error("Please enter a coupon code");
      return;
    }

    if (isApplyingCoupon) return;
    setIsApplyingCoupon(true);

    try {
      const res: any = await validateCode(codeToApply, campaignId);
      logger.info("[Apply Coupon] Validation response:", res);

      const bIsEligible = res?.data?.bIsEligible;
      const status = res?.metaData?.status || res?.["meta-data"]?.status;

      if (bIsEligible === false || (status && status >= 400)) {
        const errMsg =
          res?.data?.sReason ||
          res?.metaData?.message ||
          res?.["meta-data"]?.message ||
          "Coupon not found or campaign is not active";
        toast.error(errMsg);
        setIsApplyingCoupon(false);
        return;
      }
      handleRedeemClick();
    } catch (err: any) {
      logger.error("[Apply Coupon] Validation error:", err);
      const errMsg =
        err?.response?.data?.["meta-data"]?.message ||
        err?.response?.data?.metaData?.message ||
        err?.response?.data?.data?.sReason ||
        err?.message ||
        "Coupon not found or campaign is not active";
      toast.error(errMsg);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const isLoggedIn = checkIsLoggedIn();

  return (
    <main
      className="app-container"
      style={{
        background: `linear-gradient(180deg, ${themeColor} 0%, rgba(49, 10, 108, 0) 100%), #0c0b0a`,
        minHeight: "100vh",
      }}
    >
      {/* Loading View */}
      {isLoading && (
        <div
          className="fade-in"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "400px",
            width: "100%",
            gap: "1.2rem",
          }}
        >
          <div className="premium-loader" />
          <p style={{ color: "#ffffff", fontSize: "15px", fontWeight: "500" }}>
            Loading campaign offer details...
          </p>
        </div>
      )}

      {/* Error View */}
      {isError && !isLoading && (
        <div
          style={{
            backgroundColor: "rgba(255, 59, 48, 0.08)",
            border: "1px solid rgba(255, 59, 48, 0.25)",
            borderRadius: "20px",
            padding: "2.5rem 1.5rem",
            width: "100%",
            textAlign: "center",
            margin: "2rem 0",
          }}
        >
          <FiInfo size={40} color="#FF3B30" style={{ marginBottom: "1rem" }} />
          <h2 style={{ color: "#ffffff", fontSize: "20px", fontWeight: "700", marginBottom: "0.5rem" }}>
            Campaign Offer Unavailable
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "1.5rem" }}>
            {error instanceof Error ? error.message : "Unable to load this campaign offer."}
          </p>
          <button
            onClick={() => refetch()}
            className="btn-primary active"
            style={{
              padding: "12px 28px",
              borderRadius: "12px",
              fontWeight: "700",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Content View */}
      {data && !isLoading && (
        <>
          {/* 1. MOBILE VIEW (Visible on screens < 768px) */}
          <div className="mobile-only" style={{ width: "100%" }}>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Animated Lottie Posters Background */}
              <div className="posters-banner-container">
                <Lottie
                  lottieRef={lottieMobileRef}
                  animationData={thumbnailsJson}
                  loop={true}
                  onDOMLoaded={() => lottieMobileRef.current?.setSpeed(0.15)}
                  style={{ width: "100%", height: "100%" }}
                  rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
                />
                <div className="posters-banner-mask" />
              </div>

              {/* Top Header Logo */}
              <header style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "center", width: "100%" }}>
                <JojoLogo />
              </header>

              {/* Gold Offer Card */}
              {renderGoldOfferCard({
                planObj: selectedPlanObj,
                offerDetails,
                activeFeatures,
              })}

              {/* Coupon Redeem Section / Login Button */}
              {!isLoggedIn ? (
                <div style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: "28px" }}>
                  <button
                    onClick={() => {
                      if (campaignId) {
                        sessionStorage.setItem("pending_campaign_id", campaignId);
                      }
                      router.push("/login");
                    }}
                    className="btn-primary active"
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "9999px",
                      backgroundColor: "#F26E21",
                      color: "#000000",
                      fontSize: "16px",
                      fontWeight: "600",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    LOGIN TO REDEEM OFFER
                  </button>
                </div>
              ) : (
                <div style={{ width: "100%", textAlign: "left", marginBottom: "20px" }}>
                  <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#FFFFFF", marginBottom: "14px" }}>
                    To redeem this offer
                  </h2>

                  {/* Coupon Input Container */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      backgroundColor: "rgba(255, 255, 255, 0.12)",
                      borderRadius: "9999px",
                      padding: "4px 6px 4px 20px",
                      marginBottom: "24px",
                      border: "none",
                    }}
                  >
                    <input
                      type="text"
                      className="coupon-input"
                      placeholder="Enter Coupon Code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "#FFFFFF",
                        fontSize: "16px",
                        padding: "10px 0",
                      }}
                    />
                  </div>

                  {/* Apply Button */}
                  <div style={{ display: "flex", justifyContent: "center", width: "100%", marginBottom: "28px" }}>
                    <button
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon}
                      style={{
                        width: "50%",
                        minWidth: "160px",
                        padding: "12px",
                        borderRadius: "9999px",
                        backgroundColor: isApplyingCoupon ? "rgba(242, 110, 33, 0.7)" : "rgba(242, 110, 33, 1)",
                        color: "#FFFFFF",
                        fontSize: "18px",
                        fontWeight: "700",
                        border: "none",
                        cursor: isApplyingCoupon ? "not-allowed" : "pointer",
                        textAlign: "center",
                        boxShadow: "0 4px 15px rgba(242, 110, 33, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                    >
                      {isApplyingCoupon ? (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
                            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                            <circle cx="12" cy="12" r="10" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="3" />
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                        </>
                      ) : (
                        "Apply"
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Terms Accordions */}
              {renderAccordions({
                termsList,
                showTerms,
                setShowTerms,
              })}

              <Footer />
            </div>
          </div>

          {/* 2. DESKTOP VIEW (Visible on screens >= 768px) */}
          <div className="desktop-only" style={{ width: "100%" }}>
            {/* Lottie Background Posters Banner */}
            <div className="posters-banner-container">
              <Lottie
                lottieRef={lottieDesktopRef}
                animationData={thumbnailsJson}
                loop={true}
                onDOMLoaded={() => lottieDesktopRef.current?.setSpeed(0.15)}
                style={{ width: "100%", height: "100%" }}
                rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
              />
              <div className="posters-banner-mask" />
            </div>

            {/* Top Bar Header */}
            <header style={{ marginBottom: "2.5rem", display: "flex", justifyContent: "center", width: "100%" }}>
              <JojoLogo />
            </header>

            {/* Desktop Split Layout: T&C left, Card+Action right */}
            <div className="web-split-layout">
              {/* Left Column: Terms & Conditions */}
              <div className="web-layout-left">
                {renderAccordions({ termsList, showTerms, setShowTerms })}
              </div>

              {/* Right Column: Gold Offer Card + Action Button */}
              <div className="web-layout-right">
                {/* Gold Offer Card */}
                {renderGoldOfferCard({
                  planObj: selectedPlanObj,
                  offerDetails,
                  activeFeatures,
                })}

                {/* Action below card */}
                {!isLoggedIn ? (
                  <div style={{ width: "100%", display: "flex", justifyContent: "flex-start", marginTop: "16px" }}>
                    <button
                      onClick={() => {
                        if (campaignId) {
                          sessionStorage.setItem("pending_campaign_id", campaignId);
                        }
                        router.push("/login");
                      }}
                      className="btn-primary active"
                      style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: "9999px",
                        backgroundColor: "#F26E21",
                        color: "#000000",
                        fontSize: "16px",
                        fontWeight: "600",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "center",
                      }}
                    >
                      LOGIN TO REDEEM OFFER
                    </button>
                  </div>
                ) : (
                  <div style={{ width: "100%", textAlign: "left", marginTop: "16px" }}>
                    <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#FFFFFF", marginBottom: "16px" }}>
                      To redeem this offer
                    </h2>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        backgroundColor: "rgba(255, 255, 255, 0.12)",
                        borderRadius: "9999px",
                        padding: "4px 6px 4px 20px",
                        marginBottom: "24px",
                        border: "none",
                      }}
                    >
                      <input
                        type="text"
                        className="coupon-input"
                        placeholder="Enter Coupon Code"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          color: "#FFFFFF",
                          fontSize: "16px",
                          padding: "12px 0",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-start", width: "100%" }}>
                      <button
                        onClick={handleApplyCoupon}
                        disabled={isApplyingCoupon}
                        style={{
                          width: "180px",
                          padding: "14px",
                          borderRadius: "9999px",
                          backgroundColor: isApplyingCoupon ? "rgba(242, 110, 33, 0.7)" : "rgba(242, 110, 33, 1)",
                          color: "#FFFFFF",
                          fontSize: "18px",
                          fontWeight: "700",
                          border: "none",
                          cursor: isApplyingCoupon ? "not-allowed" : "pointer",
                          textAlign: "center",
                          boxShadow: "0 4px 15px rgba(242, 110, 33, 0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        {isApplyingCoupon ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
                            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                            <circle cx="12" cy="12" r="10" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="3" />
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                        ) : (
                          "Apply"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Shared Desktop Footer */}
            <Footer />
          </div>
        </>
      )}

      {/* Login & OTP Auth Modal for Payment Initiation */}
      {showAuthModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(12px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#161616",
              borderRadius: "24px",
              border: "1px solid rgba(250, 175, 63, 0.3)",
              padding: "2rem 1.5rem",
              maxWidth: "440px",
              width: "100%",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.9)",
            }}
          >
            <button
              onClick={() => setShowAuthModal(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                color: "rgba(255, 255, 255, 0.6)",
                fontSize: "20px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>

            <JojoLogo />

            <h3 style={{ color: "#ffffff", fontSize: "18px", fontWeight: "700", margin: "1.2rem 0 0.4rem", textAlign: "center" }}>
              Login to Claim Offer
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", textAlign: "center", marginBottom: "1.5rem" }}>
              Enter your mobile number or email ID to proceed to payment.
            </p>

            {authError && (
              <div
                style={{
                  backgroundColor: "rgba(255, 59, 48, 0.1)",
                  border: "1px solid rgba(255, 59, 48, 0.3)",
                  borderRadius: "12px",
                  padding: "8px 12px",
                  color: "#FF3B30",
                  fontSize: "13px",
                  marginBottom: "1.2rem",
                  width: "100%",
                  textAlign: "center",
                }}
              >
                {authError}
              </div>
            )}

            {authStep === "verifying" ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <div className="premium-loader" style={{ margin: "0 auto 1rem" }} />
                <p style={{ color: "#ffffff", fontSize: "14px" }}>Processing login...</p>
              </div>
            ) : authStep === "input" ? (
              <FreeTrialForm
                onSubmit={handleInputSubmit}
                confirmButtonLabel="Proceed to Payment"
              />
            ) : (
              <OtpVerification
                contactInfo={contactInfo}
                onSubmit={handleOtpSubmit}
                onBack={() => setAuthStep("input")}
                onResend={handleResendOtp}
                isMobileLayout={true}
              />
            )}
          </div>
        </div>
      )}

      {showGoldPopup && (
        <div className="success-overlay">
          <GoldRestrictionModal
            subscription={goldSubscriptionInfo}
            title="You're already enjoying JOJO GOLD!"
            description="An active subscription is already running on your account."
            onClose={() => {
              setShowGoldPopup(false);
              handleReset();
            }}
          />
        </div>
      )}
    </main>
  );
}

// Helper component for Gold Offer Card (dynamically populated from backend response)
function renderGoldOfferCard({
  planObj,
  offerDetails,
  activeFeatures = [],
}: {
  planObj: any;
  offerDetails?: any;
  activeFeatures?: any[];
}) {
  const plan = planObj?.plan || {};

  // 1. Title (e.g. "12 Months", "1 Month")
  const planTitle =
    plan?.sSubProductLabel?.trim() ||
    plan?.oProductTranslation?.sTitle?.trim() ||
    plan?.oProductTranslation?.sName?.trim() ||
    plan?.sTitle ||
    plan?.sProductName ||
    "";

  // 2. Savings / Discount Badge (e.g. "20% OFF")
  const discountLabel =
    plan?.sDiscount ||
    (offerDetails?.discountValue ? `${offerDetails.discountValue}% OFF` : "");

  // 3. Currency and Prices (e.g. original ₹499, final ₹399.2)
  const currencySym = planObj?.currencySymbol || plan?.providerSku?.oPricing?.sCurrencySymbol || "₹";
  const origPriceNum = planObj?.originalPrice ?? plan?.nOriginalPrice;
  const finalPriceNum = planObj?.finalPrice ?? plan?.providerSku?.oPricing?.nPrice;

  const originalPrice =
    plan?.sOriginalPrice || (origPriceNum !== undefined ? `${currencySym}${origPriceNum}` : "");
  const finalPrice =
    plan?.sFormattedPrice || (finalPriceNum !== undefined ? `${currencySym}${finalPriceNum}` : "");

  // 4. Dynamic Subtext ("After 12 months") & Recurring Price ("₹499/year")
  const validityUnit = plan?.sValidityDuration || "month";
  const validityDays = plan?.nValidityDays || 365;
  const isYearly = validityDays >= 365 || validityUnit === "year" || (plan?.nValidityCount && plan.nValidityCount >= 12);

  const durationLabel = planTitle.toLowerCase().trim();
  const subtext = plan?.sRenewalText || plan?.sDescription || (durationLabel ? `After ${durationLabel}` : "");

  const recurringUnit = isYearly ? "year" : validityUnit;
  const recurringPrice =
    plan?.sRecurringPriceText ||
    (origPriceNum !== undefined && origPriceNum !== null ? `${currencySym}${origPriceNum}/${recurringUnit}` : "");

  // 5. Dynamic Features List directly from Backend Response (aFeatures)
  const featuresList: any[] =
    plan?.aFeatures?.length > 0
      ? plan.aFeatures
      : activeFeatures?.length > 0
        ? activeFeatures
        : [];

  return (
    <div
      style={{
        width: "100%",
        borderRadius: "24px",
        background: "linear-gradient(135deg, #F8BD4A 0%, #FDD77F 45%, #EE9E2B 100%)",
        padding: "20px 20px 16px 20px",
        color: "#1A0F00",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
        marginBottom: "24px",
      }}
    >
      {/* Top Line: Title, Discount Badge, Prices */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "17px", fontWeight: "700", color: "#1A0F00" }}>
            {planTitle}
          </span>
          {discountLabel && (
            <span
              style={{
                backgroundColor: "#000000",
                color: "#FFFFFF",
                fontSize: "11px",
                fontWeight: "600",
                padding: "4px 10px",
                borderRadius: "9999px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {discountLabel}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          {originalPrice && originalPrice !== finalPrice && (
            <span
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#4A3510",
                textDecoration: "line-through",
              }}
            >
              {originalPrice}
            </span>
          )}
          <span style={{ fontSize: "22px", fontWeight: "600", color: "#1A0F00" }}>
            {finalPrice}
          </span>
        </div>
      </div>

      {/* Subline: After 12 months ... ₹499/year */}
      {(subtext || recurringPrice) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "13px",
            color: "#3D2706",
            fontWeight: "500",
            marginBottom: "14px",
          }}
        >
          <span>{subtext}</span>
          <span>{recurringPrice}</span>
        </div>
      )}

      {/* Divider Line */}
      <div
        style={{
          height: "1px",
          backgroundColor: "rgba(0, 0, 0, 0.15)",
          margin: "0 -4px 14px -4px",
        }}
      />

      {/* 4 Feature Icons Grid dynamically from Backend API */}
      {featuresList.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(featuresList.length, 4)}, 1fr)`,
            gap: "4px",
            textAlign: "center",
          }}
        >
          {featuresList.slice(0, 4).map((feature: any, index: number) => (
            <div
              key={feature.sFeatureId || feature.sFeatureName || index}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}
            >
              {feature.sFeatureImageUrl ? (
                <img
                  src={feature.sFeatureImageUrl}
                  alt={feature.sFeatureName || ""}
                  style={{
                    width: "32px",
                    height: "28px",
                    objectFit: "contain",
                    filter: "brightness(0)",
                  }}
                />
              ) : index === 0 ? (
                <svg width="30" height="26" viewBox="0 0 34 29" fill="none">
                  <rect x="1.5" y="4" width="30" height="21" rx="2.5" stroke="#1A0F00" strokeWidth="1.8" fill="none" />
                  <rect x="4" y="6.5" width="25" height="16" rx="1" stroke="#1A0F00" strokeWidth="1.2" fill="none" />
                  <text x="17" y="16.5" textAnchor="middle" fontSize="7.5" fontFamily="sans-serif" fontWeight="700" fill="#1A0F00">
                    AD
                  </text>
                  <line x1="2.1" y1="4.9" x2="30.3" y2="24.2" stroke="#1A0F00" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              ) : index === 1 ? (
                <svg width="30" height="26" viewBox="0 0 34 29" fill="none">
                  <rect x="2" y="5" width="20" height="14" rx="2" stroke="#1A0F00" strokeWidth="1.8" fill="none" />
                  <rect x="15" y="11" width="16" height="13" rx="2" stroke="#1A0F00" strokeWidth="1.8" fill="#F8BD4A" />
                  <line x1="8" y1="19" x2="15" y2="19" stroke="#1A0F00" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              ) : index === 2 ? (
                <svg width="30" height="26" viewBox="0 0 34 29" fill="none">
                  <path d="M17 3L23 12L17 25L11 12L17 3Z" stroke="#1A0F00" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
                  <line x1="11" y1="12" x2="23" y2="12" stroke="#1A0F00" strokeWidth="1.4" />
                  <path d="M17 3L14 12L17 25L20 12L17 3Z" stroke="#1A0F00" strokeWidth="1.2" fill="none" />
                </svg>
              ) : (
                <svg width="30" height="26" viewBox="0 0 34 29" fill="none">
                  <path d="M10 5H24L18 14.5L24 24H10L16 14.5L10 5Z" stroke="#1A0F00" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
                  <line x1="8" y1="5" x2="26" y2="5" stroke="#1A0F00" strokeWidth="2" strokeLinecap="round" />
                  <line x1="8" y1="24" x2="26" y2="24" stroke="#1A0F00" strokeWidth="2" strokeLinecap="round" />
                  <path d="M14 19H20" stroke="#1A0F00" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
              <span style={{ fontSize: "10px", fontWeight: "600", color: "#1A0F00", lineHeight: "1.2", textAlign: "center" }}>
                {feature.sFeatureName}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper component for Accordions — always expanded, no toggle
function renderAccordions({
  termsList,
}: any) {
  if (!termsList || termsList.length === 0) return null;

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "28px" }}>
      <div
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          overflow: "hidden",
        }}
      >
        {/* Header — static, no toggle */}
        <div
          style={{
            width: "100%",
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <FiShield color="rgba(255, 255, 255, 0.6)" size={18} />
          <span style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff" }}>
            Terms &amp; Conditions
          </span>
        </div>

        {/* Content — always visible */}
        <div style={{ padding: "0 1.25rem 1.25rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {termsList.map((term: string, i: number) => (
            <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <span style={{ color: "#FAAF3F", fontSize: "14px", lineHeight: "1.4" }}>•</span>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                {term}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
