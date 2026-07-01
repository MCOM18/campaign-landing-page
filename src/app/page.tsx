"use client";

import { FreeTrialForm } from "@/components/FreeTrialForm";
import { GoldRestrictionModal } from "@/components/GoldRestrictionModal";
import {
  JojoLogo,
} from "@/components/Icons";
import { OtpVerification } from "@/components/OtpVerification";
import { SuccessScreen } from "@/components/SuccessScreen";
import { slugMap } from "@/enums/enums";
import { LoginIdentifierType, PageSection, TrialFormStep } from "@/enums/ui.enum";
import { useGetCountries } from "@/features/auth/hooks/useOtpLogin";
import { completeOtpVerification, initiateOtpFlow } from "@/features/auth/services/auth.service";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { appConfig, AppConfig } from "@/lib/config/app.config";
import { REGEX } from "@/lib/constants/regex";
import footerData from "@/lib/data/footer.data.json";
import { logger } from "@/lib/logger/logger";
import { trackCampaignLandingImpression, trackLoginCompleted } from "@/services/analytics/events";
import { buildDevicePayload } from "@/shared/analytics/utils/buildDevicePayload";
import { useAuthStore } from "@/store/useAuthStore";
import { decrypt } from "@lib/crypto/decrypt";
import Lottie from "lottie-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import thumbnailsJson from "../../public/assets/json/THUMBNAILS SCROLL ANIMATION.json";
import api from "../utils/apiClient";
import { getUserGeoLocation } from "../utils/userUtil";
import SubscriptionPlanCard from "./payment/SubscriptionPlanCard";
import { DEFAULT_HEADER_VALUES } from "@/lib/constants/headers";

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
  // logger.info("countries", countries)

  const [freshPlans, setFreshPlans] = useState<any>(null);

  const lottieMobileRef = useRef<any>(null);
  const lottieDesktopRef = useRef<any>(null);

  const pendingCampaignData = useRef<Record<string, any> | null>(null);

  const impressionTracked = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !isAppReady || impressionTracked.current) return;
    impressionTracked.current = true;

    try {
      const url = new URL(window.location.href);
      const dataParam = url.searchParams.get("data");

      // Extract redirect URL from /link=<url> in pathname, or from ?link= query param
      let redirectUrl = "";
      const pathname = window.location.pathname;
      const linkPathMatch = pathname.match(/\/link=(.+)/);
      if (linkPathMatch) {
        redirectUrl = decodeURIComponent(linkPathMatch[1]);
      } else {
        const linkParam = url.searchParams.get("link");
        if (linkParam) redirectUrl = linkParam;
      }

      if (redirectUrl) {
        redirectUrl = redirectUrl.replace(/^(https?):\/([^/])/, "$1://$2");
      }

      // Collect all other query params (UTMs, source, other_info, etc.)
      const queryParams: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        if (key !== "data" && key !== "link") queryParams[key] = value;
      });

      let decoded: any = null;
      if (dataParam) {
        logger.info("[Campaign] Found data parameter:", dataParam);
        // Attempt 1: AES Decryption
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

      /** Convert a display name like "Jai Kanhaiyalal Ki" → "jai-kanhaiyalal-ki" */
      function toSlug(name: string): string {
        return name
          .toLowerCase()
          .trim()
          .replace(REGEX.SLUG_SPECIAL_CHARS, "")  // remove special chars
          .replace(REGEX.SLUG_SPACES, "-")        // spaces → hyphens
          .replace(REGEX.SLUG_MULTIPLE_HYPHENS, "-"); // collapse multiple hyphens
      }

      // Build final redirect URL
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
        // Build structured payload
        const enrichedData = {
          decoded_data: decoded,       // { path, type, nameAnalytic } or { pricing_plan, ... }
          link: redirectUrl,
          redirectUrl,
          finalRedirectUrl,
          ...queryParams,              // utm_source, utm_medium, source, source_link, other_info, etc.
        };
        localStorage.setItem("campaign_decoded_data", JSON.stringify(enrichedData));
        pendingCampaignData.current = enrichedData;
        logger.info("[Campaign] Campaign data ready, waiting for analytics service.");
      }

      // Build and send the requested detailed campaign impression payload
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
      trackCampaignLandingImpression(impressionPayload);

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

  const specialOffer = AppConfig.specialOfferPlan;

  useEffect(() => {
    const firstGroup = specialOffer?.aAllSubscriptionPlans?.[0];
    const theme = specialOffer?.sTheme || specialOffer?.theme || firstGroup?.sTheme || firstGroup?.theme || "theme-default";

    document.body.classList.forEach((cls) => {
      if (cls.startsWith("theme-")) {
        document.body.classList.remove(cls);
      }
    });

    document.body.classList.add(theme);

    return () => {
      document.body.classList.remove(theme);
    };
  }, [specialOffer]);

  const subscriptionGroup = specialOffer?.oSubscriptionGroup;
  const product = subscriptionGroup?.aSubscriptionProducts?.[0];
  const offer = product?.oOfferDetails || product?.aProviderSkus?.[0]?.oOfferDetails;
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

  const [step, setStep] = useState<TrialFormStep>(TrialFormStep.INPUT);
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

  // Selective cleanup of session and payment states on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const keysToRemove = [
        "selectedPlan",
        "payment_init_data",
        "payment_sToken",
        "payment_sProviderToken",
        "session_id",
        "user_id",
        "userData"
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

      logger.info("[Storage Cleanup] Stale session and payment details cleared.");
    } catch (e) {
      logger.error("[Storage Cleanup] Failed to clear storage", e);
    }
  }, []);

  // Handle browser back button when in OTP step to return to phone/email input step
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (step !== TrialFormStep.OTP) return;

    // Push dummy history entry for OTP step
    window.history.pushState({ step: "otp" }, "");

    const handlePopState = (event: PopStateEvent) => {
      setStep(TrialFormStep.INPUT);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [step]);

  // Flatten all products/skus from the fetched plans list for display in the selection list
  const flatPlansList: any[] = [];
  if (freshPlans?.aAllSubscriptionPlans) {
    for (const group of freshPlans.aAllSubscriptionPlans) {
      if (group.aSubscriptionProducts) {
        for (const product of group.aSubscriptionProducts) {
          if (product.aProviderSkus) {
            for (const sku of product.aProviderSkus) {
              const planObj = {
                ...group,
                oSubscriptionGroup: {
                  ...group,
                  oGroupTranslation: group.oGroupTranslation,
                  aSubscriptionProducts: [
                    {
                      ...product,
                      aProviderSkus: [sku],
                      oOfferDetails: sku.oOfferDetails
                    }
                  ]
                }
              };
              flatPlansList.push({
                uniqueKey: `${group.sGroupId}-${product.sProductId}-${sku.sUniqueSkuId}`,
                plan: planObj,
                product: product,
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
    setError(null);
    setIsVerifying(true);

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

      // Track Login Completed event (runs asynchronously on success, regardless of Gold subscription status)
      try {
        const finalPhoneCode = response.phone_code || parsedPhoneCode || "";
        const finalPhoneOnly = response.phone || parsedPhone || "";
        const phoneCode = finalPhoneCode ? `+${finalPhoneCode.replace(REGEX.NON_DIGIT, '')}` : "";
        const phoneOnly = finalPhoneOnly ? finalPhoneOnly.replace(REGEX.NON_DIGIT, '') : "";
        const identifier = isEmail ? (response.email || contactInfo) : `${phoneCode}${phoneOnly}`;
        if (otpCode) useAuthStore.getState().setLoginOtp(otpCode);

        trackLoginCompleted(
          isEmail ? LoginIdentifierType.EMAIL : LoginIdentifierType.PHONE,
          identifier,
          otpCode,
          phoneCode,
          phoneOnly
        ).catch((err) => {
          logger.error("[OTP] Failed to track login completed", err);
        });
      } catch (err) {
        logger.error("[OTP] Error in preparing trackLoginCompleted", err);
      }

      // Check if the user has an active Gold (SVOD) subscription
      let isGoldUser = false;
      let freshPlansData: any = null;
      try {
        const geoData = getUserGeoLocation();
        const payloadVerify = { countryCode: geoData?.country_code || "IN" };
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
          // If not a gold user, fetch the fresh plans list with the session ID header
          const payloadPlans = {
            country: geoData?.country_code || "IN",
            deviceTypeId: 3,
            languageId: 1
          };
          const headersPlans = { sessionid: response.session_id };

          logger.info("[Verify Subscription] Fetching plans list post-verification... Request:", { payload: payloadPlans, headers: headersPlans });

          const plansResponse = await api.post("subscription/allplans", payloadPlans, {
            headers: headersPlans
          });
          freshPlansData = plansResponse.data?.data;
          logger.info("[Verify Subscription] Fresh plans loaded successfully:", plansResponse.data);
        }
      } catch (subErr) {
        logger.error("[Verify Subscription] Failed to verify subscription status or fetch plans:", subErr);
      }



      if (!isGoldUser) {
        // Find if any product has offer details in the fresh plans data
        const allPlansListFresh = freshPlansData?.aAllSubscriptionPlans || [];
        let offerProduct: any = null;
        let offerSku: any = null;
        let offerGroup: any = null;

        for (const g of allPlansListFresh) {
          if (g.aSubscriptionProducts) {
            for (const p of g.aSubscriptionProducts) {
              if (p.aProviderSkus) {
                for (const s of p.aProviderSkus) {
                  if (s.oOfferDetails) {
                    offerProduct = p;
                    offerSku = s;
                    offerGroup = g;
                    break;
                  }
                }
              }
              if (offerProduct) break;
            }
          }
          if (offerProduct) break;
        }

        // Store the fresh plans data in state
        setFreshPlans(freshPlansData);

        if (offerProduct) {
          // Store selected plan with offer in localStorage
          const selectedPlanObj = {
            ...offerGroup,
            oSubscriptionGroup: {
              ...offerGroup,
              oGroupTranslation: offerGroup.oGroupTranslation,
              aSubscriptionProducts: [
                {
                  ...offerProduct,
                  aProviderSkus: [
                    {
                      ...offerSku,
                      sProviderOfferId: offerSku.sProviderOfferId || offerSku.oOfferDetails?.sProviderOfferId,
                      oOfferDetails: offerSku.oOfferDetails
                    }
                  ]
                }
              ]
            }
          };
          localStorage.setItem("selectedPlan", JSON.stringify(selectedPlanObj));
          router.push("/payment");
        } else {
          // If no offer details is found (it is null)
          // Set step to PLANS to show the plan selection screen
          setStep(TrialFormStep.PLANS);
          setIsVerifying(false);
        }
      }
    } catch (err: any) {
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
        <p style={{ color: "#ffffff", fontSize: "15px" }}>Loading settings...</p>
      </div>
    );
  }

  return (
    <>
      <main className="app-container">
        {/* 1. MOBILE VIEW (Visible on screens < 768px) */}
        <div className="mobile-only" style={{ width: "100%" }}>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {Object.values(PageSection).map((section) => {
              if (section === PageSection.BANNER) {
                return (
                  <div key={section} className="posters-banner-container">
                    <Lottie
                      lottieRef={lottieMobileRef}
                      animationData={thumbnailsJson}
                      loop={true}
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
                      {pageTitle || ""}
                    </h1>
                    <div style={{ width: "280px", display: "flex", flexDirection: "column", alignItems: "center", marginTop: "6px" }}>
                      <div className="gold-bg-gradient" style={{ width: "100%", height: "1.5px" }} />
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
                );
              }
              if (section === PageSection.FEATURES) {
                return (
                  <div
                    key={section}
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
                        <img src={feature.sFeatureImageUrl} alt={feature.sFeatureName} style={{ width: "32px", height: "32px", objectFit: "contain" }} />
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
                        <p style={{ color: "#ffffff", fontSize: "15px" }}>Verifying OTP...</p>
                      </div>
                    ) : step === TrialFormStep.INPUT ? (
                      <FreeTrialForm
                        onSubmit={handleInputSubmit}
                        confirmButtonLabel={confirmButtonLabel}
                        disclaimerText={disclaimerText}
                        footerNote={footerNote}
                      />
                    ) : step === TrialFormStep.OTP ? (
                      <OtpVerification
                        contactInfo={contactInfo}
                        onSubmit={handleOtpSubmit}
                        onBack={handleBack}
                        onResend={handleResendOtp}
                        disclaimerText={disclaimerText}
                      />
                    ) : step === TrialFormStep.PLANS ? (
                      <div className="fade-in" style={{ width: "100%" }}>
                        <div
                          style={{
                            padding: "14px 16px",
                            borderRadius: "12px",
                            border: "1px solid rgba(250, 175, 63, 0.3)",
                            background: "rgba(250, 175, 63, 0.08)",
                            color: "#FAAF3F",
                            fontSize: "13px",
                            lineHeight: "18px",
                            textAlign: "center",
                            marginBottom: "1.5rem",
                            fontWeight: "500",
                          }}
                        >
                          You are not eligible for a free trial as this offer has already been claimed on your account. Please choose a plan below to subscribe.
                        </div>

                        <div className="plans-selection-container" style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "2rem", width: "100%" }}>
                          {flatPlansList.map((planObj, idx) => (
                            <SubscriptionPlanCard
                              key={planObj.uniqueKey}
                              plan={planObj.plan}
                              isActive={selectedPlanIndex === idx}
                              onClick={() => setSelectedPlanIndex(idx)}
                              isSelectionScreen={true}
                            />
                          ))}
                        </div>

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
                          {`Proceed to pay ${flatPlansList[selectedPlanIndex]?.sku?.oPricing?.sCurrencySymbol || "₹"}${flatPlansList[selectedPlanIndex]?.sku?.oPricing?.nPrice !== undefined ? flatPlansList[selectedPlanIndex].sku.oPricing.nPrice : "499"}`}
                        </button>

                        {freshPlans?.sFooterNote && (
                          <p
                            style={{
                              color: "rgba(255, 255, 255, 0.7)",
                              fontSize: "14px",
                              lineHeight: "22px",
                              textAlign: "center",
                              fontWeight: "400",
                              width: "100%",
                              marginTop: "2.5rem",
                              whiteSpace: "pre-line",
                            }}
                          >
                            {freshPlans.sFooterNote}
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
        </div>

        {/* 2. DESKTOP VIEW (Visible on screens >= 768px) */}
        <div className="desktop-only" style={{ width: "100%" }}>
          {(() => {
            const renderedColumns = new Set();
            return Object.values(PageSection).map((section) => {
              if (section === PageSection.BANNER) {
                return (
                  <div key={section} className="posters-banner-container">
                    <Lottie
                      lottieRef={lottieDesktopRef}
                      animationData={thumbnailsJson}
                      loop={true}
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
                      {pageTitle || ""}
                    </h1>
                    <div style={{ width: "280px", display: "flex", flexDirection: "column", alignItems: "center", marginTop: "6px" }}>
                      <div className="gold-bg-gradient" style={{ width: "100%", height: "1.5px" }} />
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
                                  disclaimerText={disclaimerText}
                                  footerNote={footerNote}
                                />
                              ) : step === TrialFormStep.OTP ? (
                                <OtpVerification
                                  contactInfo={contactInfo}
                                  onSubmit={handleOtpSubmit}
                                  onBack={handleBack}
                                  onResend={handleResendOtp}
                                  disclaimerText={disclaimerText}
                                />
                              ) : step === TrialFormStep.PLANS ? (
                                <div className="fade-in" style={{ width: "100%" }}>
                                  <div
                                    style={{
                                      padding: "14px 16px",
                                      borderRadius: "12px",
                                      border: "1px solid rgba(250, 175, 63, 0.3)",
                                      background: "rgba(250, 175, 63, 0.08)",
                                      color: "#FAAF3F",
                                      fontSize: "13px",
                                      lineHeight: "18px",
                                      textAlign: "center",
                                      marginBottom: "1.5rem",
                                      fontWeight: "500",
                                    }}
                                  >
                                    You are not eligible for a free trial as this offer has already been claimed on your account. Please choose a plan below to subscribe.
                                  </div>

                                  <div className="plans-selection-container" style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "2rem", width: "100%" }}>
                                    {flatPlansList.map((planObj, idx) => (
                                      <SubscriptionPlanCard
                                        key={planObj.uniqueKey}
                                        plan={planObj.plan}
                                        isActive={selectedPlanIndex === idx}
                                        onClick={() => setSelectedPlanIndex(idx)}
                                        isSelectionScreen={true}
                                      />
                                    ))}
                                  </div>

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
                                    {`Proceed to pay ${flatPlansList[selectedPlanIndex]?.sku?.oPricing?.sCurrencySymbol || "₹"}${flatPlansList[selectedPlanIndex]?.sku?.oPricing?.nPrice !== undefined ? flatPlansList[selectedPlanIndex].sku.oPricing.nPrice : "499"}`}
                                  </button>

                                  {freshPlans?.sFooterNote && (
                                    <p
                                      style={{
                                        color: "rgba(255, 255, 255, 0.7)",
                                        fontSize: "14px",
                                        lineHeight: "22px",
                                        textAlign: "center",
                                        fontWeight: "400",
                                        width: "100%",
                                        marginTop: "2.5rem",
                                        whiteSpace: "pre-line",
                                      }}
                                    >
                                      {freshPlans.sFooterNote}
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
          <footer className="web-footer-container">
            <div className="web-footer-grid">
              <div className="web-footer-column">
                <a href="https://jojoapp.in/terms-conditions" target="_blank" rel="noopener noreferrer" className="web-footer-link" style={{ textDecoration: "none" }}>Terms & Conditions</a>
                <a href="https://jojoapp.in/privacy-policy" target="_blank" rel="noopener noreferrer" className="web-footer-link" style={{ textDecoration: "none" }}>Privacy Policy</a>
                <div style={{ marginTop: "1rem" }}>
                  <a href="https://jojoapp.in/" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block" }}>
                    <img
                      src="/assets/plain_logo.svg"
                      alt="JOJO Logo"
                      style={{ width: "93px", height: "30px", display: "block", cursor: "pointer" }}
                    />
                  </a>
                </div>
              </div>

              <div className="web-footer-column">
                <a href="https://jojolimited.com/career" target="_blank" rel="noopener noreferrer" className="web-footer-link" style={{ textDecoration: "none" }}>Careers</a>
                <a href="https://jojolimited.com/contact" target="_blank" rel="noopener noreferrer" className="web-footer-link" style={{ textDecoration: "none" }}>Contact us</a>
                <a href="mailto:support@appjojo.in" className="web-footer-link" style={{ textDecoration: "none" }}>Support</a>
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
                  <a
                    href="https://play.google.com/store/apps/details?id=com.navkarevent.jojo&pcampaignid=web_share%5D"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: "#e2e2e2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "6px 10px",
                      borderRadius: "4px",
                      height: "37px",
                      cursor: "pointer",
                      textDecoration: "none"
                    }}
                  >
                    <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
                      <img src="/assets/google_play_logo.png" alt="Google Play Icon" style={{ width: "21px", height: "22px" }} />
                      <img src="/assets/google_play_text.svg" alt="Google Play Store" style={{ width: "76.7px", height: "23.5px" }} />
                    </div>
                  </a>
                  {/* App Store Button */}
                  <a
                    href="https://apps.apple.com/us/app/jojo-app-movies-shows-natak/id1665094876"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: "var(--text-footer)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "6px 10px",
                      borderRadius: "4px",
                      height: "37px",
                      cursor: "pointer",
                      textDecoration: "none"
                    }}
                  >
                    <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
                      <img src="/assets/apple_logo.svg" alt="Apple Icon" style={{ width: "19.3px", height: "22.6px" }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px", justifyContent: "center" }}>
                        <img src="/assets/apple_text_line1.svg" alt="Download on the" style={{ width: "72.6px", height: "6.4px" }} />
                        <img src="/assets/apple_text_line2.svg" alt="App Store" style={{ width: "78.8px", height: "15.6px" }} />
                      </div>
                    </div>
                  </a>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "1rem", justifyContent: "flex-end" }}>
                  <img src="/assets/copyright.svg" alt="Copyright Icon" style={{ width: "14px", height: "14px" }} />
                  <span style={{ fontSize: "12px", color: "var(--text-footer)", fontWeight: 400 }}>
                    {new Date().getFullYear()} JOJO LIMITED. All the Copyrights Reserved.
                  </span>
                </div>
              </div>
            </div>
          </footer>
        </div>

        {/* Unified Success State Overlay Modal - outside main so fixed covers full viewport */}
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
            title="You’re already enjoying JOJO GOLD!"
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
