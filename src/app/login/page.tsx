"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FreeTrialForm } from "@/components/FreeTrialForm";
import { OtpVerification } from "@/components/OtpVerification";
import Footer from "@/components/Footer";
import { TrialFormStep } from "@/enums/ui.enum";
import { useGetCountries } from "@/features/auth/hooks/useOtpLogin";
import { initiateOtpFlow, completeOtpVerification } from "@/features/auth/services/auth.service";
import { getOfferByCampaign } from "@/features/offer/api/getOfferByCampaign";
import { useAuthStore } from "@/store/useAuthStore";
import { appConfig } from "@/lib/config/app.config";
import { REGEX } from "@/lib/constants/regex";
import { getUserGeoLocation } from "@/utils/userUtil";
import { logger } from "@/lib/logger/logger";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";

export default function LoginPage() {
  const router = useRouter();
  const { isAppReady } = useBootstrap();
  const { data: countries = [] } = useGetCountries();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [campaignData, setCampaignData] = useState<any>(null);
  const [isLoadingCampaign, setIsLoadingCampaign] = useState<boolean>(true);

  const [step, setStep] = useState<TrialFormStep>(TrialFormStep.INPUT);
  const [contactInfo, setContactInfo] = useState<string>("");
  const [parsedPhone, setParsedPhone] = useState<string>("");
  const [parsedPhoneCode, setParsedPhoneCode] = useState<string>("");
  const [isExists, setIsExists] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
        logger.error("[LoginPage Auth Restore] Failed to parse userData", e);
      }
    }
  }, [setAuth]);

  // Fetch campaign details API using pending_campaign_id on mount / refresh
  useEffect(() => {
    if (!isAppReady) return;

    const fetchCampaignDetails = async () => {
      try {
        setIsLoadingCampaign(true);
        let pendingCampaignId = "";
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const queryId = urlParams.get("pending_campaign_id")
          if (queryId) {
            localStorage.setItem("pending_campaign_id", queryId);
            pendingCampaignId = queryId;
          } else {
            pendingCampaignId = localStorage.getItem("pending_campaign_id") || "";
          }
        }

        const targetCampaignId = pendingCampaignId || "";
        if (!targetCampaignId) {
          logger.info("[LoginPage] No pending_campaign_id found in localStorage or URL, replacing route to /");
          router.replace("/");
          return;
        }

        logger.info("[LoginPage] Refresh / Mount - Requesting campaign details for pending_campaign_id:", targetCampaignId);
        const offerRes: any = await getOfferByCampaign(targetCampaignId);
        logger.info("[LoginPage] Campaign details response:", offerRes);

          const dataObj = offerRes?.data?.data || offerRes?.data || offerRes || {};
          setCampaignData(dataObj);

          // Map and store default selectedPlan from subscription plans if available
          const subscriptionPlansGroup = dataObj?.aAllSubscriptionPlans || [];
          const offerDetails = dataObj?.offerDetails || {};
          const campaignDetails = dataObj?.campaignDetails || {};
          const discountVal = offerDetails?.discountValue || 0;
          const offerType = offerDetails?.offerType || "PERCENTAGE_DISCOUNT";

          const flatPlansList = (Array.isArray(subscriptionPlansGroup) ? subscriptionPlansGroup : []).flatMap((group: any) => {
            const products = group?.aSubscriptionProducts || (group?.aProviderSkus ? [group] : []);
            return (Array.isArray(products) ? products : []).map((prod: any) => {
              const sku = prod?.aProviderSkus?.[0] || prod?.sku || {};
              const couponDetails = sku?.oCouponDetails || {};

              const origPrice = couponDetails?.nOriginalPrice ?? sku?.oPricing?.nPrice ?? 499;

              let finalPrice = origPrice;
              if (couponDetails?.nFinalAmount !== undefined && couponDetails?.nFinalAmount !== null) {
                finalPrice = couponDetails.nFinalAmount;
              } else if (offerType === "PERCENTAGE_DISCOUNT" && discountVal > 0) {
                finalPrice = Math.round(origPrice * (1 - discountVal / 100));
              } else if (offerType === "FLAT_DISCOUNT" && discountVal > 0) {
                finalPrice = Math.max(0, origPrice - discountVal);
              }

              const symbol = couponDetails?.sCurrencySymbol || sku?.oPricing?.sCurrencySymbol || "₹";

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
                ...prod,
                product: prod,
                group: group,
                sku: modifiedSku,
                providerSku: modifiedSku,
                pricing: modifiedSku.oPricing,
                sFormattedPrice: `${symbol}${finalPrice}`,
                sAltPrice: `${symbol}${finalPrice}`,
                sOriginalPrice: finalPrice < origPrice ? `${symbol}${origPrice}` : null,
                nOriginalPrice: origPrice,
                finalPrice: finalPrice,
                originalPrice: origPrice,
                currencySymbol: symbol,
                sDiscount: discountLabel,
                discountLabel: discountLabel,
                nValidity: prod.nValidityDays || 365,
                aFeatures: prod.aFeatures || [],
                oOfferDetails: offerDetails,
                oCampaignDetails: campaignDetails,
              };
            });
          });

          if (flatPlansList.length > 0 && typeof window !== "undefined") {
            localStorage.setItem("selectedPlan", JSON.stringify(flatPlansList[0]));
          }
      } catch (err) {
        logger.error("[LoginPage] Failed to fetch campaign details:", err);
      } finally {
        setIsLoadingCampaign(false);
      }
    };

    fetchCampaignDetails();
  }, [isAppReady]);

  const campaignDetails = campaignData?.campaignDetails || {};
  const metadata = campaignDetails?.metadata || {};
  const campaignName = campaignDetails?.campaignName || "JOJO Gold Offer";
  const campaignBannerUrl = metadata?.campaignBannerImage?.url || metadata?.thumbnailImage?.url || "";
  const logosList = metadata?.logos || [];
  const mainLogoUrl = logosList.find((l: any) => l.name === "main")?.url || logosList[0]?.url || "";

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

        const codesToCheck =
          countries.length > 0
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

      clearTimeout(safetyTimeout);
      setIsVerifying(false);
      router.push("/payment");
    } catch (err: any) {
      clearTimeout(safetyTimeout);
      setIsVerifying(false);
      setError(err?.message || "Invalid OTP code. Please try again.");
    }
  };

  const handleBack = () => {
    setStep(TrialFormStep.INPUT);
    setError(null);
  };

  const handleResendOtp = async () => {
    try {
      await initiateOtpFlow(parsedPhone, parsedPhoneCode);
      toast.success("OTP resent successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend OTP");
    }
  };

  return (
    <main
      className="app-container"
      style={{
        background: "linear-gradient(180deg, #310A6C 0%, rgba(49, 10, 108, 0) 100%), #0c0b0a",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0",
      }}
    >
      <div
        className="login-flow-screen fade-in"
        style={{
          width: "100%",
          maxWidth: "480px",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "32px 24px 24px",
        }}
      >
        {/* Header: JOJO Logo & Campaign Main Logo */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "16px",
            marginBottom: "20px",
            marginTop: "16px"
          }}
        >
          {isLoadingCampaign ? (
            <div
              className="skeleton-pulse"
              style={{
                width: "120px",
                height: "36px",
                borderRadius: "8px",
              }}
            />
          ) : mainLogoUrl ? (
            <img
              src={mainLogoUrl}
              alt={campaignName}
              style={{ height: "36px", maxWidth: "120px", objectFit: "contain" }}
            />
          ) : (
            <img
              src="/assets/images/Logo/JOJO_LOGO.svg"
              alt="JOJO"
              style={{ width: "110px", height: "36px", objectFit: "contain" }}
            />
          )}
        </div>

        {/* Campaign Banner Image / Skeleton */}
        {isLoadingCampaign ? (
          <div
            className="skeleton-pulse"
            style={{
              width: "100%",
              height: "220px",
              borderRadius: "20px",
              marginBottom: "20px",
            }}
          />
        ) : campaignBannerUrl ? (
          <div
            style={{
              width: "100%",
              borderRadius: "20px",
              overflow: "hidden",
              marginBottom: "20px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
            }}
          >
            <img
              src={campaignBannerUrl}
              alt={campaignName}
              style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }}
            />
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              borderRadius: "20px",
              overflow: "hidden",
              marginBottom: "20px",
            }}
          >
            <img
              src="/assets/images/Logo/Mask_group.svg"
              alt=""
              style={{ width: "100%", display: "block" }}
            />
          </div>
        )}

        {/* Form Container */}
        <div style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Campaign Heading / Skeleton */}
          {step === TrialFormStep.INPUT && (
            isLoadingCampaign ? (
              <div
                className="skeleton-pulse"
                style={{
                  width: "70%",
                  height: "24px",
                  borderRadius: "6px",
                  marginBottom: "20px",
                }}
              />
            ) : (
              <h1
                className="gold-text-gradient"
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  textAlign: "center",
                  margin: "0 0 20px 0",
                  lineHeight: "1.3",
                }}
              >
                {campaignName || "Login to redeem offer"}
              </h1>
            )
          )}

          {/* Error Message */}
          {error && (
            <div style={{ color: "#ff4a4a", fontSize: "14px", marginBottom: "16px", width: "100%", textAlign: "center", fontWeight: "500" }}>
              {error}
            </div>
          )}

          {/* Loader or Form Steps */}
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
              <p style={{ color: "#ffffff", fontSize: "15px", marginTop: "16px" }}>Verifying OTP...</p>
            </div>
          ) : step === TrialFormStep.INPUT ? (
            <div style={{ width: "100%" }}>
              <FreeTrialForm
                onSubmit={handleInputSubmit}
                confirmButtonLabel="Next"
                footerNote=""
              />
            </div>
          ) : step === TrialFormStep.OTP ? (
            <div style={{ width: "100%" }}>
              <OtpVerification
                contactInfo={contactInfo}
                onSubmit={handleOtpSubmit}
                onBack={handleBack}
                onResend={handleResendOtp}
                disclaimerText=""
                isMobileLayout={true}
              />
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{ width: "100%", marginTop: "32px" }}>
          <Footer />
        </div>
      </div>
    </main>
  );
}
