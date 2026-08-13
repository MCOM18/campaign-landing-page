"use client";

import Footer from "@/components/Footer";
import { FreeTrialForm } from "@/components/FreeTrialForm";
import { GoldRestrictionModal } from "@/components/GoldRestrictionModal";
import {
  JojoLogo,
} from "@/components/Icons";
import { OtpVerification } from "@/components/OtpVerification";
import PageSkeleton from "@/components/PageSkeleton";
import { SuccessScreen } from "@/components/SuccessScreen";
import { slugMap } from "@/enums/enums";
import { PageSection, TrialFormStep } from "@/enums/ui.enum";
import { useGetCountries } from "@/features/auth/hooks/useOtpLogin";
import { completeOtpVerification, initiateOtpFlow } from "@/features/auth/services/auth.service";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { appConfig } from "@/lib/config/app.config";
import { DEFAULT_HEADER_VALUES } from "@/lib/constants/headers";
import { REGEX } from "@/lib/constants/regex";
import { logger } from "@/lib/logger/logger";
import { trackEvent } from "@/services/analytics/events";
import { buildDevicePayload } from "@/shared/analytics/utils/buildDevicePayload";
import { useAuthStore } from "@/store/useAuthStore";
import { decrypt } from "@lib/crypto/decrypt";
import Lottie from "lottie-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import thumbnailsJson from "../../public/assets/json/THUMBNAILS SCROLL ANIMATION.json";
import api from "../utils/apiClient";
import { getUserGeoLocation } from "../utils/userUtil";
import SubscriptionPlanCard, { SingleCouponInput } from "./payment/SubscriptionPlanCard";

const renderFooterWithLinks = (text: string) => {
  if (!text) return null;

  const termsText = "Terms of Use";
  const privacyText = "Privacy Statement";

  if (text.includes(termsText) && text.includes(privacyText)) {
    const partsByTerms = text.split(termsText);
    const beforeTerms = partsByTerms[0];
    const afterTerms = partsByTerms.slice(1).join(termsText);

    const partsByPrivacy = afterTerms.split(privacyText);
    const betweenTermsAndPrivacy = partsByPrivacy[0];
    const afterPrivacy = partsByPrivacy.slice(1).join(privacyText);

    return (
      <>
        {beforeTerms}
        <a
          href="https://jojoapp.in/terms-conditions"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#FAAF3F", textDecoration: "underline", fontWeight: "600" }}
        >
          {termsText}
        </a>
        {betweenTermsAndPrivacy}
        <a
          href="https://jojoapp.in/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#FAAF3F", textDecoration: "underline", fontWeight: "600" }}
        >
          {privacyText}
        </a>
        {afterPrivacy}
      </>
    );
  }

  if (text.includes(termsText)) {
    const parts = text.split(termsText);
    return (
      <>
        {parts[0]}
        <a
          href="https://jojoapp.in/terms-conditions"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#FAAF3F", textDecoration: "underline", fontWeight: "600" }}
        >
          {termsText}
        </a>
        {parts.slice(1).join(termsText)}
      </>
    );
  }

  if (text.includes(privacyText)) {
    const parts = text.split(privacyText);
    return (
      <>
        {parts[0]}
        <a
          href="https://jojoapp.in/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#FAAF3F", textDecoration: "underline", fontWeight: "600" }}
        >
          {privacyText}
        </a>
        {parts.slice(1).join(privacyText)}
      </>
    );
  }

  return text;
};

export default function page() {
  const router = useRouter();
  const { isAppReady } = useBootstrap();
  const { data: countries = [] } = useGetCountries();

  // Campaign plan data fetched from subscription/allplans-campaign
  const [campaignPlan, setCampaignPlan] = useState<any>(null);
  const [isCampaignLoading, setIsCampaignLoading] = useState(true);

  // Check pending_campaign_id in localStorage
  const [isCampaignLogin, setIsCampaignLogin] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const pendingCampaignId = sessionStorage.getItem("pending_campaign_id");
      setIsCampaignLogin(Boolean(pendingCampaignId));
    }
  }, []);

  const [freshPlans, setFreshPlans] = useState<any>(null);

  const lottieMobileRef = useRef<any>(null);
  const lottieDesktopRef = useRef<any>(null);

  const pendingCampaignData = useRef<Record<string, any> | null>(null);
  const impressionTracked = useRef(false);

  // Fetch subscription/allplans-campaign on mount
  useEffect(() => {
    if (!isAppReady) return;

    const fetchCampaignPlan = async () => {
      try {
        setIsCampaignLoading(true);
        const geoData = getUserGeoLocation();
        const payload = {
          country: geoData?.country_code || "IN",
          deviceTypeId: 3,
          languageId: 1,
        };
        logger.info("[CampaignPage] Fetching allplans-campaign... payload:", payload);
        const response = await api.post("subscription/allplans-campaign", payload, {});
        const data = response.data?.data;
        logger.info("[CampaignPage] allplans-campaign response:", data);
        setCampaignPlan(data);
        // Pre-populate freshPlans so plan cards are ready even before OTP
        setFreshPlans(data);
      } catch (err) {
        logger.error("[CampaignPage] Failed to fetch allplans-campaign:", err);
      } finally {
        setIsCampaignLoading(false);
      }
    };

    fetchCampaignPlan();
  }, [isAppReady]);

  useEffect(() => {
    if (typeof window === "undefined" || !isAppReady || impressionTracked.current) return;
    impressionTracked.current = true;

    try {
      localStorage.setItem("source_link", window.location.href);

      const url = new URL(window.location.href);
      
      const campaignIdQuery = url.searchParams.get("campaignId") || url.searchParams.get("campaign_id");
      if (campaignIdQuery) {
        router.push(`/offer/${campaignIdQuery}`);
        return;
      }

      const dataParam = url.searchParams.get("data");

      let redirectUrl = "";
      const pathname = window.location.pathname;
      const linkPathMatch = pathname.match(/\/link=(.+)/);
      if (linkPathMatch) {
        redirectUrl = decodeURIComponent(linkPathMatch[1]);
      } else {
        const linkParam = url.searchParams.get("source_link");
        if (linkParam) redirectUrl = linkParam;
      }

      if (redirectUrl) {
        redirectUrl = redirectUrl.replace(/^(https?):\/([^/])/, "$1://$2");
        localStorage.setItem("source_link", redirectUrl);
      } else {
        localStorage.setItem("source_link", window.location.href);
      }

      const queryParams: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        if (key !== "data" && key !== "source_link") queryParams[key] = value;
      });

      let decoded: any = null;
      if (dataParam) {
        logger.info("[Campaign] Found data parameter:", dataParam);
        try {
          const decryptedText = decrypt(dataParam, true);
          if (decryptedText) {
            decoded = JSON.parse(decryptedText);
            logger.info("[Campaign] Decrypted via AES:", decoded);
          }
        } catch (e) {
          logger.info("[Campaign] AES decryption failed, trying hex decode.");
        }
      }

      function toSlug(name: string): string {
        return name
          .toLowerCase()
          .trim()
          .replace(REGEX.SLUG_SPECIAL_CHARS, "")
          .replace(REGEX.SLUG_SPACES, "-")
          .replace(REGEX.SLUG_MULTIPLE_HYPHENS, "-");
      }

      let finalRedirectUrl = "";
      if (decoded && redirectUrl) {
        try {
          const redirectUrlObj = new URL(redirectUrl);
          const contentPath = String(decoded.path || "");
          const contentType = Number(decoded.type || 0);
          const contentName = String(decoded.nameAnalytic || "");
          const typeSlug = slugMap[contentType];

          if (contentPath && typeSlug && contentName) {
            redirectUrlObj.pathname = `/${typeSlug}/${toSlug(contentName)}/${contentPath}`;
            finalRedirectUrl = redirectUrlObj.toString();
          } else {
            Object.keys(decoded).forEach((key) => {
              if (decoded[key] !== undefined)
                redirectUrlObj.searchParams.set(key, String(decoded[key]));
            });
            finalRedirectUrl = redirectUrlObj.toString();
          }

          localStorage.setItem("campaign_redirect_url", finalRedirectUrl);
          logger.info("[Campaign] Stored redirect URL:", finalRedirectUrl);
        } catch (urlErr) {
          logger.error("[Campaign] Failed to construct redirect URL:", urlErr);
        }
      }

      if (!dataParam && !redirectUrl) {
        localStorage.removeItem("campaign_redirect_url");
        localStorage.removeItem("campaign_decoded_data");
        logger.info("[Campaign] Clean URL detected. Removed campaign data from localStorage.");
      } else {
        const enrichedData = {
          decoded_data: decoded,
          link: redirectUrl || window.location.href,
          redirectUrl: redirectUrl || window.location.href,
          finalRedirectUrl,
          source_link: queryParams.source_link || window.location.href,
          ...queryParams,
        };
        localStorage.setItem("campaign_decoded_data", JSON.stringify(enrichedData));
        pendingCampaignData.current = enrichedData;
        logger.info("[Campaign] Campaign data ready, waiting for analytics service.");
      }

      const devicePayload = buildDevicePayload();

      const impressionPayload = {
        event_name: "campaign_landing_impression",
        campaign_id: decoded?.campaign_id || decoded?.id || url.searchParams.get("campaign_id") || "",
        campaign_name: decoded?.campaign_name || decoded?.name || decoded?.nameAnalytic || url.searchParams.get("campaign_name") || "",
        campaign_type: decoded?.campaign_type || url.searchParams.get("campaign_type") || "landing_page",
        device_type: DEFAULT_HEADER_VALUES.DEVICE_TYPE_CODE,
        platform: "web",
        os: devicePayload.os || "unknown",
        browser: devicePayload.browser || "unknown",
        page_url: window.location.href,
        utm_source: url.searchParams.get("utm_source") || queryParams.utm_source || "",
        utm_medium: url.searchParams.get("utm_medium") || queryParams.utm_medium || "",
        utm_campaign: url.searchParams.get("utm_campaign") || queryParams.utm_campaign || "",
        utm_content: url.searchParams.get("utm_content") || queryParams.utm_content || "",
        ad_id: url.searchParams.get("ad_id") || queryParams.ad_id || "",
        ad_type: url.searchParams.get("ad_type") || queryParams.ad_type || "",
        ad_placement: url.searchParams.get("ad_placement") || queryParams.ad_placement || "",
        cta_type: url.searchParams.get("cta_type") || queryParams.cta_type || "",
        target_screen: url.searchParams.get("target_screen") || queryParams.target_screen || "",
        language: DEFAULT_HEADER_VALUES.LANGUAGE,
        lat: getUserGeoLocation()?.lat || null,
        lng: getUserGeoLocation()?.lng || null,
        country: getUserGeoLocation()?.country_code || "IN",
        timestamp: new Date().toISOString(),
        ...queryParams
      };

      logger.info("[Analytics] Sending campaign_landing_impression payload:", impressionPayload);
      trackEvent("campaign_landing_impression", impressionPayload);

    } catch (err) {
      logger.error("[Campaign] Error in campaign initialization/impression:", err);
    }
  }, [isAppReady]);

  useEffect(() => {
    if (lottieDesktopRef.current) {
      lottieDesktopRef.current.setSpeed(0.15);
    }
  }, [lottieDesktopRef.current]);

  useEffect(() => {
    if (lottieMobileRef.current) {
      lottieMobileRef.current.setSpeed(0.15);
    }
  }, [lottieMobileRef.current]);

  // Apply theme from campaign plan data
  useEffect(() => {
    const firstGroup = campaignPlan?.aAllSubscriptionPlans?.[0];
    const theme = campaignPlan?.sTheme || campaignPlan?.theme || firstGroup?.sTheme || firstGroup?.theme || "theme-default";

    document.body.classList.forEach((cls) => {
      if (cls.startsWith("theme-")) {
        document.body.classList.remove(cls);
      }
    });

    document.body.classList.add(theme);

    return () => {
      document.body.classList.remove(theme);
    };
  }, [campaignPlan]);

  // Derive plan details from the actual /subscription/allplans-campaign response structure:
  // { data: { aAllSubscriptionPlans: [...], sFooterNote, sHeaderMediaURL } }
  // oOfferDetails is null for all SKUs in this endpoint — so we fall back to group/product fields.
  const firstGroup = campaignPlan?.aAllSubscriptionPlans?.[0];
  const firstProduct = firstGroup?.aSubscriptionProducts?.[0];

  // CTA button label – no offer translation, use a sensible default
  const confirmButtonLabel = "Subscribe Now";

  // Features from the first product
  const activeFeatures: any[] = firstProduct?.aFeatures || [];

  // Disclaimer: build from pricing of first SKU
  const firstSku = firstProduct?.aProviderSkus?.[0];
  const pricing = firstSku?.oPricing;
  const currencySymbol = pricing?.sCurrencySymbol || "₹";
  const productPrice = pricing?.nPrice !== undefined ? pricing.nPrice : "";
  const disclaimerText = productPrice
    ? `Auto-renews at ${currencySymbol}${productPrice}/year. Cancel anytime.`
    : "";

  // Footer note comes at the top level of the response data
  const footerNote = campaignPlan?.sFooterNote || "";

  const [step, setStep] = useState<TrialFormStep>(() => {
    if (typeof window !== "undefined") {
      const sessionId = localStorage.getItem("session_id");
      const userId = localStorage.getItem("user_id");
      if (sessionId && userId) {
        return TrialFormStep.PLANS;
      }
    }
    return TrialFormStep.INPUT;
  });
  const [contactInfo, setContactInfo] = useState("");
  const [parsedPhone, setParsedPhone] = useState("");
  const [parsedPhoneCode, setParsedPhoneCode] = useState("");
  const [isExists, setIsExists] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goldSubscriptionInfo, setGoldSubscriptionInfo] = useState<any>(null);
  const [showGoldPopup, setShowGoldPopup] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);

  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);

  // Restore auth store state on mount if session exists
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sessionId = localStorage.getItem("session_id");
    const userId = localStorage.getItem("user_id");
    const userDataRaw = localStorage.getItem("userData");
    if (sessionId && userId) {
      try {
        const user = userDataRaw ? JSON.parse(userDataRaw) : { id: userId };
        setAuth(user, sessionId, "");
      } catch (e) {
        logger.error("[Auth Restore] Failed to parse userData", e);
      }
    }
  }, [setAuth]);

  // Selective cleanup of payment states on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const keysToRemove = [
        "selectedPlan",
        "payment_init_data",
        "payment_sToken",
        "payment_sProviderToken"
      ];
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      const sessionKeysToRemove = [
        "payment_status",
        "payment_success_state",
        "payment_razorpay_id",
        "payment_subscription_id",
        "payment_order_id"
      ];
      sessionKeysToRemove.forEach((key) => localStorage.removeItem(key));

      logger.info("[Storage Cleanup] Stale payment details cleared.");
    } catch (e) {
      logger.error("[Storage Cleanup] Failed to clear storage", e);
    }
  }, []);

  // Handle browser back button when in OTP step
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (step !== TrialFormStep.OTP) return;

    window.history.pushState({ step: "otp" }, "");

    const handlePopState = (event: PopStateEvent) => {
      setStep(TrialFormStep.INPUT);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [step]);

  // Flatten all products/skus from the fetched plans list for display
  const flatPlansList: any[] = [];
  if (freshPlans?.aAllSubscriptionPlans) {
    for (const group of freshPlans.aAllSubscriptionPlans) {
      if (group.aSubscriptionProducts) {
        for (const prod of group.aSubscriptionProducts) {
          if (prod.aProviderSkus) {
            for (const sku of prod.aProviderSkus) {
              const planObj = {
                ...group,
                oSubscriptionGroup: {
                  ...group,
                  oGroupTranslation: group.oGroupTranslation,
                  aSubscriptionProducts: [
                    {
                      ...prod,
                      aProviderSkus: [sku],
                      oOfferDetails: sku.oOfferDetails
                    }
                  ]
                }
              };
              flatPlansList.push({
                uniqueKey: `${group.sGroupId}-${prod.sProductId}-${sku.sUniqueSkuId}`,
                plan: planObj,
                product: prod,
                sku: sku,
                group: group
              });
            }
          }
        }
      }
    }
  }

  const handleSelectPlanAndContinue = () => {
    const selected = flatPlansList[selectedPlanIndex];
    if (selected) {
      localStorage.setItem("selectedPlan", JSON.stringify(selected.plan));
      router.push("/payment");
    }
  };

  const handleInputSubmit = async (contact: string) => {
    setError(null);
    setIsVerifying(true);

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
      setStep(TrialFormStep.OTP);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please check your credentials and try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpSubmit = async (otpCode: string) => {
    if (isVerifying) return;
    setError(null);
    setIsVerifying(true);

    const safetyTimeout = setTimeout(() => {
      setIsVerifying(false);
      setError("Verification took too long. Please try again.");
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
        geoData?.city || undefined,
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
      let freshPlansData: any = null;
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
          setIsVerifying(false);
          handleReset();
        } else {
          // Fetch fresh plans using allplans-campaign endpoint (same as this page's initial load)
          const geoDataPlans = getUserGeoLocation();
          const payloadPlans = {
            country: geoDataPlans?.country_code || "IN",
            deviceTypeId: 3,
            languageId: 1
          };
          const headersPlans = { sessionid: response.session_id };

          logger.info("[Verify Subscription] Fetching allplans-campaign post-verification... Request:", { payload: payloadPlans, headers: headersPlans });

          const plansResponse = await api.post("subscription/allplans-campaign", payloadPlans, {
            headers: headersPlans
          });
          freshPlansData = plansResponse.data?.data;
          logger.info("[Verify Subscription] Fresh plans loaded successfully:", plansResponse.data);
        }
      } catch (subErr) {
        logger.error("[Verify Subscription] Failed to verify subscription status or fetch plans:", subErr);
      }

      if (!isGoldUser) {
        const pendingCampaignId = typeof window !== "undefined" ? sessionStorage.getItem("pending_campaign_id") : null;
        if (pendingCampaignId) {
          clearTimeout(safetyTimeout);
          setIsVerifying(false);
          router.push(`/offer/${pendingCampaignId}`);
          return;
        }

        // allplans-campaign never has oOfferDetails, so always show plan selection.
        // Use fresh post-login plans if available, otherwise fall back to the initially loaded data.
        if (freshPlansData) {
          setFreshPlans(freshPlansData);
        }
        // freshPlans is already set from the initial load; if post-OTP fetch succeeded it's updated above.
        setStep(TrialFormStep.PLANS);
        setIsVerifying(false);
      }
      clearTimeout(safetyTimeout);
    } catch (err: any) {
      clearTimeout(safetyTimeout);
      setError(err.message || "Invalid OTP code. Please try again.");
      setIsVerifying(false);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === TrialFormStep.OTP) {
      window.history.back();
    } else {
      setStep(TrialFormStep.INPUT);
    }
  };

  const handleReset = () => {
    setError(null);
    setStep(TrialFormStep.INPUT);
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

  if (!isAppReady || isCampaignLoading) {
    return <PageSkeleton />;
  }

  return (
    <>
      <main
        className="app-container"
        style={{

          minHeight: "100vh",
        }}
      >
        {/* 1. MOBILE VIEW (Visible on screens < 768px) */}
        <div className="mobile-only" style={{ width: "100%" }}>

          {/* Login Flow: Dynamic background & banner media based on pending_campaign_id */}
          {(step === TrialFormStep.INPUT || step === TrialFormStep.OTP) ? (
            <div
              className="login-flow-screen fade-in"
              style={{
                position: "fixed",
                inset: 0,
                margin: "0 auto",
                maxWidth: "480px",
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                overflowY: "scroll",
                scrollbarWidth: "none",
                background: isCampaignLogin
                  ? "linear-gradient(180deg, #310A6C 0%, rgba(49, 10, 108, 0) 100%), #0c0b0a"
                  : "linear-gradient(180deg, #1c0f03 0%, var(--theme-glow-color) 90%)",
              }}
            >
              {/* Banner media & Logo layout based on pending_campaign_id */}
              {isCampaignLogin ? (
                <>
                  {/* Logo at top */}
                  <div style={{ width: "100%", display: "flex", justifyContent: "center", paddingTop: "48px", paddingBottom: "0", position: "relative", zIndex: 2 }}>
                    <img
                      src="/assets/images/Logo/JOJO_LOGO.svg"
                      alt="JOJO"
                      style={{ width: "112px", height: "36px", display: "block" }}
                    />
                  </div>

                  {/* Mask group image */}
                  <div style={{ width: "100%", maxWidth: "480px", overflow: "hidden", flexShrink: 0, position: "relative", marginTop: "-4px" }}>
                    <img
                      src="/assets/images/Logo/Mask_group.svg"
                      alt=""
                      style={{ width: "100%", display: "block", userSelect: "none", pointerEvents: "none" }}
                    />
                    {/* Top gradient to blend logo area seamlessly into the image */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "48px",
                        background: "linear-gradient(180deg, #310A6C 0%, rgba(49, 10, 108, 0) 100%)",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Lottie touching top */}
                  <div style={{ width: "100%", height: "210px", overflow: "hidden", flexShrink: 0, position: "relative", margin: 0, padding: 0 }}>
                    <Lottie
                      lottieRef={lottieMobileRef}
                      animationData={thumbnailsJson}
                      loop={true}
                      onDOMLoaded={() => lottieMobileRef.current?.setSpeed(0.15)}
                      style={{ width: "100%", height: "100%", display: "block" }}
                      rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
                    />
                  </div>

                  {/* JOJO Gold Logo below Lottie */}
                  <div style={{ width: "100%", display: "flex", justifyContent: "center", paddingTop: "16px", paddingBottom: "16px" }}>
                    <JojoLogo />
                  </div>
                </>
              )}

              {/* Form content */}
              <div
                style={{
                  width: "100%",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "0 24px 20px",
                }}
              >
                {/* Heading */}
                {step === TrialFormStep.INPUT && (
                  <h1
                    className="gold-text-gradient"
                    style={{
                      fontSize: "24px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "1.2px",
                      textAlign: "center",
                      margin: "0 0 24px 0",
                      lineHeight: "1.4",
                    }}
                  >
                    Login to explore your journey
                  </h1>
                )}

                {/* Error */}
                {error && (
                  <div style={{ color: "#ff4a4a", fontSize: "14px", marginBottom: "1rem", width: "100%", textAlign: "center", fontWeight: "500" }}>
                    {error}
                  </div>
                )}

                {/* Verifying state */}
                {isVerifying ? (
                  <div
                    className="fade-in"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "200px",
                      width: "100%",
                    }}
                  >
                    <div className="premium-loader" />
                    <p style={{ color: "#ffffff", fontSize: "15px" }}>Verifying OTP...</p>
                  </div>
                ) : step === TrialFormStep.INPUT ? (
                  <div style={{ width: "100%" }}>
                    <FreeTrialForm
                      onSubmit={handleInputSubmit}
                      confirmButtonLabel={confirmButtonLabel}
                      footerNote={footerNote}
                      showCarousel={true}
                    />
                  </div>
                ) : step === TrialFormStep.OTP ? (
                  <div style={{ width: "100%" }}>
                    <OtpVerification
                      contactInfo={contactInfo}
                      onSubmit={handleOtpSubmit}
                      onBack={handleBack}
                      onResend={handleResendOtp}
                      disclaimerText={disclaimerText}
                      isMobileLayout={true}
                    />
                  </div>
                ) : null}
              </div>

              {/* Footer inside login overlay */}
              <div style={{ width: "100%", padding: "0 24px 32px" }}>
                <Footer />
              </div>
            </div>
          ) : (
            /* Normal scrollable view for PLANS and other steps */
            <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
              {Object.values(PageSection).map((section) => {
                if (section === PageSection.BANNER) {
                  return (
                    <div key={section} className="posters-banner-container">
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
                  );
                }
                if (section === PageSection.TOPBAR) {
                  return (
                    <header key={section} style={{ marginBottom: "2rem", display: "flex", justifyContent: "center", width: "100%" }}>
                      <JojoLogo />
                    </header>
                  );
                }
                if (section === PageSection.HEADING) {
                  if (step === TrialFormStep.PLANS) return null;
                  return (
                    <div key={section} style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2.5rem" }}>
                      <h1
                        className="gold-text-gradient"
                        style={{
                          fontSize: "30px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "1.5px",
                          textAlign: "center",
                          margin: 0,
                          lineHeight: "48px",
                        }}
                      >
                        Login to explore your journey
                      </h1>
                    </div>
                  );
                }
                if (section === PageSection.FORM) {
                  return (
                    <div key={section} style={{ width: "100%" }}>
                      {error && (
                        <div style={{ color: "#ff4a4a", fontSize: "14px", marginBottom: "1.5rem", width: "100%", textAlign: "center", fontWeight: "500" }}>
                          {error}
                        </div>
                      )}
                      {step === TrialFormStep.PLANS ? (
                        <div className="fade-in" style={{ width: "100%" }}>
                          <div className="plans-selection-container" style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "1rem", width: "100%" }}>
                            {flatPlansList.map((planObj, idx) => (
                              <SubscriptionPlanCard
                                key={planObj.uniqueKey}
                                plan={planObj.plan}
                                isActive={selectedPlanIndex === idx}
                                onClick={() => setSelectedPlanIndex(idx)}
                                isSelectionScreen={true}
                                showCouponInput={false}
                              />
                            ))}
                          </div>

                          <SingleCouponInput />

                          <button
                            onClick={handleSelectPlanAndContinue}
                            className="btn-primary active btn-start-trial"
                            style={{
                              width: "80%",
                              display: "block",
                              marginLeft: "auto",
                              marginRight: "auto",
                              padding: "12px",
                              fontWeight: "700"
                            }}
                          >
                            Upgrade Now
                          </button>

                          {freshPlans?.sFooterNote && (
                            <p
                              style={{
                                color: "rgba(255, 255, 255, 0.7)",
                                fontSize: "14px",
                                lineHeight: "22px",
                                textAlign: "left",
                                fontWeight: "400",
                                width: "100%",
                                marginTop: "2.5rem",
                                whiteSpace: "pre-line",
                              }}
                            >
                              {renderFooterWithLinks(freshPlans.sFooterNote)}
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
          {/* Footer for normal (PLANS) view */}
          <Footer />
        </div>

        {/* 2. DESKTOP VIEW (Visible on screens >= 768px) */}
        <div className="desktop-only" style={{ width: "100%" }}>
          {(() => {
            const renderedColumns = new Set();
            return Object.values(PageSection).map((section) => {
              if (section === PageSection.BANNER) {
                return (
                  <div key={section} className="posters-banner-container">
                    {isCampaignLogin ? (
                      <img
                        src="/assets/images/Logo/Mask_group.svg"
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", userSelect: "none", pointerEvents: "none" }}
                      />
                    ) : (
                      <Lottie
                        lottieRef={lottieDesktopRef}
                        animationData={thumbnailsJson}
                        loop={true}
                        onDOMLoaded={() => lottieDesktopRef.current?.setSpeed(0.15)}
                        style={{ width: "100%", height: "100%" }}
                        rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
                      />
                    )}
                    <div className="posters-banner-mask" />
                  </div>
                );
              }
              if (section === PageSection.TOPBAR) {
                return (
                  <header key={section} style={{ marginBottom: "2rem", display: "flex", justifyContent: "center", width: "100%" }}>
                    {isCampaignLogin ? (
                      /* Campaign login: show JOJO header logo */
                      <img
                        src="/assets/images/Logo/JOJO_LOGO.svg"
                        alt="JOJO"
                        style={{ width: "112px", height: "36px", display: "block" }}
                      />
                    ) : (
                      /* Non-campaign: always show JOJO Gold logo (same as mobile view) */
                      <JojoLogo />
                    )}
                  </header>
                );
              }
              if (section === PageSection.HEADING) {
                if (step === TrialFormStep.PLANS) return null;
                return (
                  <div key={section} style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "3.5rem" }}>
                    <h1
                      className="gold-text-gradient"
                      style={{
                        fontSize: "30px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: "1.5px",
                        textAlign: "center",
                        margin: 0,
                        lineHeight: "48px",
                      }}
                    >
                      Login to explore your journey
                    </h1>
                  </div>
                );
              }

              if (section === PageSection.FORM || section === PageSection.FEATURES) {
                if (renderedColumns.has(section)) return null;

                const columns = Object.values(PageSection).filter(
                  (s) => s === PageSection.FORM || s === PageSection.FEATURES
                );

                columns.forEach((c) => renderedColumns.add(c));

                return (
                  <div key="split-layout" className="web-split-layout">
                    {columns.map((col) => {
                      if (col === PageSection.FORM) {
                        return (
                          <div key={col} className="web-layout-left">
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
                                  <p style={{ color: "#ffffff", fontSize: "15px" }}>Verifying OTP...</p>
                                </div>
                              ) : step === TrialFormStep.INPUT ? (
                                <FreeTrialForm
                                  onSubmit={handleInputSubmit}
                                  confirmButtonLabel={confirmButtonLabel}
                                  footerNote={footerNote}
                                />
                              ) : step === TrialFormStep.OTP ? (
                                <OtpVerification
                                  contactInfo={contactInfo}
                                  onSubmit={handleOtpSubmit}
                                  onBack={handleBack}
                                  onResend={handleResendOtp}
                                  disclaimerText={disclaimerText}
                                  isMobileLayout={false}
                                />
                              ) : step === TrialFormStep.PLANS ? (
                                <div className="fade-in" style={{ width: "100%" }}>
                                  <div className="plans-selection-container" style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "1rem", width: "100%" }}>
                                    {flatPlansList.map((planObj, idx) => (
                                      <SubscriptionPlanCard
                                        key={planObj.uniqueKey}
                                        plan={planObj.plan}
                                        isActive={selectedPlanIndex === idx}
                                        onClick={() => setSelectedPlanIndex(idx)}
                                        isSelectionScreen={true}
                                        showCouponInput={false}
                                      />
                                    ))}
                                  </div>

                                  <SingleCouponInput />

                                  <button
                                    onClick={handleSelectPlanAndContinue}
                                    className="btn-primary active btn-start-trial"
                                    style={{
                                      width: "80%",
                                      display: "block",
                                      marginLeft: "auto",
                                      marginRight: "auto",
                                      padding: "12px",
                                      fontWeight: "700"
                                    }}
                                  >
                                    Upgrade Now
                                  </button>

                                  {freshPlans?.sFooterNote && (
                                    <p
                                      style={{
                                        color: "rgba(255, 255, 255, 0.7)",
                                        fontSize: "14px",
                                        lineHeight: "22px",
                                        textAlign: "left",
                                        fontWeight: "400",
                                        width: "100%",
                                        marginTop: "2.5rem",
                                        whiteSpace: "pre-line",
                                      }}
                                    >
                                      {renderFooterWithLinks(freshPlans.sFooterNote)}
                                    </p>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      }
                      if (col === PageSection.FEATURES) {
                        return (
                          <div key={col} className="web-layout-right">
                            <div className="web-features-header">
                              <div className="web-features-header-line" />
                              <span className="web-features-header-text gold-text-gradient">GOLD FEATURES</span>
                              <div className="web-features-header-line" />
                            </div>

                            <div className="web-features-grid">
                              {activeFeatures.map((feature: any) => (
                                <div key={feature.sFeatureId || feature.sFeatureName} className="feature-card">
                                  <img src={feature.sFeatureImageUrl} alt={feature.sFeatureName} style={{ width: "32px", height: "32px", objectFit: "contain" }} />
                                  <span className="gold-text-gradient" style={{ fontSize: "12px", fontWeight: "600", textAlign: "center" }}>
                                    {feature.sFeatureName}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                );
              }
              return null;
            });
          })()}

          {/* Footer links at the bottom */}
          <Footer />
        </div>

        {/* Unified Success State Overlay Modal */}
      </main>
      {step === TrialFormStep.SUCCESS && (
        <div className="success-overlay">
          <SuccessScreen onReset={handleReset} />
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
    </>
  );
}