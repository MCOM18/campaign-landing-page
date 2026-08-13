import React, { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { validateCode } from "@/features/offer/api/validateCode";
import { fetchOfferByCampaignCached } from "@/features/offer/hooks/useOfferByCampaign";
import { logger } from "@/lib/logger/logger";
import "./payment.css";

interface SubscriptionPlanCardProps {
  plan?: any;
  planObj?: any;
  offerDetails?: any;
  activeFeatures?: any[];
  isActive?: boolean;
  onClick?: () => void;
  landscapeUrl?: string | null;
  isSelectionScreen?: boolean;
  showCouponInput?: boolean;
}

async function fetchAndStoreCampaignPlan(campaignRefId: string, couponCode: string, fallbackPlan?: any) {
  try {
    const offerRes: any = await fetchOfferByCampaignCached(campaignRefId, couponCode);
    const offerData = offerRes?.data?.data || offerRes?.data || offerRes || {};
    const offerDetails = offerData?.offerDetails || {};
    const campaignDetails = offerData?.campaignDetails || {};
    const subscriptionPlansGroup =
      offerData?.aAllSubscriptionPlans ||
      offerData?.subscriptionPlansGroup ||
      offerData?.aSubscriptionProducts ||
      offerData?.plans ||
      [];

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

    const planToStore = flatPlansList[0] || fallbackPlan;
    if (planToStore && typeof window !== "undefined") {
      localStorage.setItem("selectedPlan", JSON.stringify(planToStore));
    }
  } catch (err) {
    logger.warn("[fetchAndStoreCampaignPlan] Failed to fetch campaign plan:", err);
    if (fallbackPlan && typeof window !== "undefined") {
      localStorage.setItem("selectedPlan", JSON.stringify(fallbackPlan));
    }
  }
}

const SubscriptionPlanCard: React.FC<SubscriptionPlanCardProps> = ({
  plan: planProp,
  planObj: planObjProp,
  offerDetails: offerDetailsProp,
  activeFeatures: activeFeaturesProp = [],
  isActive = true,
  onClick,
  landscapeUrl = null,
  showCouponInput = false,
}) => {
  const router = useRouter();
  const [couponCode, setCouponCode] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  const planInput = planObjProp || planProp;
  if (!planInput) return null;

  const effectivePlan = planInput?.plan || planInput;
  const product = effectivePlan?.product || effectivePlan?.oSubscriptionGroup?.aSubscriptionProducts?.[0];
  const group = effectivePlan?.group || effectivePlan?.oSubscriptionGroup;
  const sku = effectivePlan?.sku || effectivePlan?.providerSku || product?.aProviderSkus?.[0];
  const offer = offerDetailsProp || effectivePlan?.oOfferDetails || product?.oOfferDetails || sku?.oOfferDetails || planInput?.offerDetails;

  const handleVerifyCoupon = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanCode = couponCode.trim();
    if (!cleanCode) {
      const errText = "Please enter a coupon code";
      setCouponError(errText);
      return;
    }

    if (isVerifying) return;
    setIsVerifying(true);
    setCouponError(null);
    setCouponSuccess(null);

    try {
      logger.info("[SubscriptionPlanCard] Validating coupon code:", cleanCode);
      const response: any = await validateCode(cleanCode, "");
      logger.info("[SubscriptionPlanCard] Validation response:", response);

      const resData = response?.data?.data || response?.data || response;
      const metaData = response?.metaData || response?.["meta-data"] || {};
      const bIsEligible = resData?.bIsEligible ?? (metaData?.status === 200);

      const campaignDetails = resData?.campaignDetails || {};
      const campaignRefId =
        campaignDetails?.campaignRefId ||
        resData?.campaignRefId ||
        campaignDetails?.campaignId ||
        resData?.campaignId;

      if (bIsEligible !== false && (metaData?.status === 200 || metaData?.status === undefined || bIsEligible === true)) {
        const successMsg = resData?.sReason || metaData?.message || "Coupon code is valid and eligible";
        setCouponSuccess(successMsg);

        if (typeof window !== "undefined") {
          localStorage.removeItem("sCouponCode");
          // Save coupon code to sessionStorage so Payment page can display it
          sessionStorage.setItem("applied_coupon_code", cleanCode);
          if (campaignRefId) {
            sessionStorage.setItem("pending_campaign_id", campaignRefId);
          }
        }

        if (campaignRefId) {
          await fetchAndStoreCampaignPlan(campaignRefId, cleanCode, effectivePlan);
        } else if (effectivePlan && typeof window !== "undefined") {
          localStorage.setItem("selectedPlan", JSON.stringify(effectivePlan));
        }

        setCouponCode("");

        setTimeout(() => {
          router.push("/payment");
        }, 400);
      } else {
        const errorMsg = resData?.sReason || metaData?.message || "Invalid or ineligible coupon code";
        setCouponError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      logger.error("[SubscriptionPlanCard] Validation error:", err);
      const errorMsg =
        err?.response?.data?.["meta-data"]?.message ||
        err?.response?.data?.metaData?.message ||
        err?.response?.data?.data?.sReason ||
        err?.message ||
        "Invalid coupon code. Please try again.";
      setCouponError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  // 1. Title (e.g. "12 Months", "1 Month")
  const planTitle =
    effectivePlan?.sSubProductLabel?.trim() ||
    product?.sSubProductLabel?.trim() ||
    sku?.sSubProductLabel?.trim() ||
    effectivePlan?.oProductTranslation?.sTitle?.trim() ||
    effectivePlan?.oProductTranslation?.sName?.trim() ||
    group?.oGroupTranslation?.sName?.trim() ||
    group?.oGroupTranslation?.sTitle?.trim() ||
    effectivePlan?.sTitle ||
    effectivePlan?.sName ||
    effectivePlan?.sProductName ||
    planInput?.name ||
    "JOJO Gold";

  // 2. Savings / Discount Badge (e.g. "20% OFF")
  const discountLabel =
    planInput?.discountLabel ||
    effectivePlan?.sDiscount ||
    (offer?.discountValue ? `${offer.discountValue}% OFF` : "");

  // 3. Currency and Prices (e.g. original ₹624, final ₹499)
  const currencySym =
    planInput?.currencySymbol ||
    effectivePlan?.currencySymbol ||
    sku?.oPricing?.sCurrencySymbol ||
    effectivePlan?.pricing?.sCurrencySymbol ||
    "₹";

  const origPriceNum =
    planInput?.originalPrice ??
    planInput?.originalPriceNum ??
    effectivePlan?.nOriginalPrice ??
    sku?.oPricing?.nOriginalPrice;

  const finalPriceNum =
    planInput?.finalPrice ??
    planInput?.finalPriceNum ??
    sku?.oPricing?.nPrice ??
    effectivePlan?.pricing?.nPrice ??
    effectivePlan?.nPrice;

  const originalPrice =
    effectivePlan?.sOriginalPrice ||
    planInput?.originalPriceFormatted ||
    (typeof origPriceNum === "string" && origPriceNum.includes(currencySym)
      ? origPriceNum
      : origPriceNum !== undefined && origPriceNum !== null && origPriceNum !== ""
        ? `${currencySym}${origPriceNum}`
        : "");

  const finalPrice =
    effectivePlan?.sFormattedPrice ||
    effectivePlan?.sAltPrice ||
    planInput?.finalPriceFormatted ||
    (typeof finalPriceNum === "string" && finalPriceNum.includes(currencySym)
      ? finalPriceNum
      : finalPriceNum !== undefined && finalPriceNum !== null && finalPriceNum !== ""
        ? `${currencySym}${finalPriceNum}`
        : "");

  // 4. Dynamic Subtext ("After 12 months") & Recurring Price ("₹624/year" or "₹120/month")
  const validityUnit = effectivePlan?.sValidityDuration || product?.sValidityDuration || "month";
  const validityDays = effectivePlan?.nValidityDays || effectivePlan?.nValidity || product?.nValidityDays || 30;
  const isYearly =
    validityDays >= 365 ||
    validityUnit === "year" ||
    (effectivePlan?.nValidityCount && effectivePlan.nValidityCount >= 12);

  const durationLabel = planTitle.toLowerCase().trim();
  const subtext =
    effectivePlan?.sRenewalText ||
    effectivePlan?.sDescription ||
    (durationLabel ? `After ${durationLabel}` : "");

  const recurringUnit = isYearly ? "year" : validityUnit;
  const cleanOrigPriceNum =
    typeof origPriceNum === "number"
      ? origPriceNum
      : typeof origPriceNum === "string"
        ? origPriceNum.replace(/^[^\d.]+/, "")
        : null;

  const recurringPrice =
    effectivePlan?.sRecurringPriceText ||
    (cleanOrigPriceNum !== null && cleanOrigPriceNum !== ""
      ? `${currencySym}${cleanOrigPriceNum}/${recurringUnit}`
      : "");

  // 5. Dynamic Features List directly from Backend API (aFeatures)
  const featuresList: any[] =
    effectivePlan?.aFeatures?.length > 0
      ? effectivePlan.aFeatures
      : product?.aFeatures?.length > 0
        ? product.aFeatures
        : activeFeaturesProp?.length > 0
          ? activeFeaturesProp
          : planInput?.features?.length > 0
            ? planInput.features
            : [];

  const DEFAULT_FEATURES = [
    { sFeatureName: "No In Video Ads" },
    { sFeatureName: "Watch on upto 4 Devices" },
    { sFeatureName: "Exclusive Content" },
    { sFeatureName: "Early Bird Access" },
  ];

  const featuresToRender = featuresList.length > 0 ? featuresList.slice(0, 4) : DEFAULT_FEATURES;

  // Selection styling: When selected (isActive === true), show ONLY gold border, no solid background color fill!
  const borderStyle = isActive
    ? "2px solid #FAAF3F"
    : "1.5px solid rgba(255, 255, 255, 0.1)";

  const backgroundStyle = isActive
    ? "rgba(250, 175, 63, 0.06)"
    : "rgba(255, 255, 255, 0.03)";

  const boxShadowStyle = isActive
    ? "0 0 20px rgba(250, 175, 63, 0.25)"
    : "none";

  const mainTextColor = "#FFFFFF";
  const subTextColor = isActive ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.6)";
  const origPriceColor = "rgba(255, 255, 255, 0.5)";
  const strokeColor = isActive ? "#FAAF3F" : "#FFFFFF";

  return (
    <div className="spc-wrapper" style={{ width: "100%", marginBottom: "24px" }}>
      {landscapeUrl && (
        <div className="spc-landscape">
          <img src={landscapeUrl} alt={planTitle} />
        </div>
      )}
      <div
        onClick={onClick}
        className={`spc-box${isActive ? " spc-box--active" : " spc-box--default"}`}
        style={{
          width: "100%",
          borderRadius: landscapeUrl ? "0 0 24px 24px" : "24px",
          background: backgroundStyle,
          border: borderStyle,
          padding: "20px 20px 16px 20px",
          color: mainTextColor,
          boxShadow: boxShadowStyle,
          cursor: onClick ? "pointer" : "default",
          transition: "all 0.25s ease",
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
            <span style={{ fontSize: "18px", fontWeight: "700", color: mainTextColor, letterSpacing: "-0.2px" }}>
              {planTitle}
            </span>
            {discountLabel && (
              <span
                style={{
                  backgroundColor: "#000000",
                  color: "#FFFFFF",
                  border: isActive ? "1px solid rgba(250, 175, 63, 0.6)" : "1px solid rgba(255, 255, 255, 0.2)",
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
                  fontWeight: "500",
                  color: origPriceColor,
                  textDecoration: "line-through",
                }}
              >
                {originalPrice}
              </span>
            )}
            <span style={{ fontSize: "24px", fontWeight: "700", color: isActive ? "#FAAF3F" : "#FFFFFF" }}>
              {finalPrice}
            </span>
          </div>
        </div>

        {/* Subline: After 1 month ... ₹120/month */}
        {(subtext || recurringPrice) && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "13px",
              color: subTextColor,
              fontWeight: "400",
              marginBottom: "14px",
              marginTop: "4px",
            }}
          >
            <span>{subtext}</span>
            <span>{recurringPrice}</span>
          </div>
        )}

        {/* Horizontal Divider Line */}
        <div
          style={{
            height: "1px",
            backgroundColor: isActive ? "rgba(250, 175, 63, 0.3)" : "rgba(255, 255, 255, 0.12)",
            margin: "0 -4px 14px -4px",
          }}
        />

        {/* 4 Feature Icons Grid */}
        {featuresToRender.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(featuresToRender.length, 4)}, 1fr)`,
              gap: "4px",
              textAlign: "center",
            }}
          >
            {featuresToRender.map((feature: any, index: number) => (
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
                      filter: isActive ? "none" : "opacity(0.8)",
                    }}
                  />
                ) : index === 0 ? (
                  <svg width="30" height="26" viewBox="0 0 34 29" fill="none">
                    <rect x="1.5" y="4" width="30" height="21" rx="2.5" stroke={strokeColor} strokeWidth="1.8" fill="none" />
                    <rect x="4" y="6.5" width="25" height="16" rx="1" stroke={strokeColor} strokeWidth="1.2" fill="none" />
                    <text x="17" y="16.5" textAnchor="middle" fontSize="7.5" fontFamily="sans-serif" fontWeight="700" fill={strokeColor}>
                      AD
                    </text>
                    <line x1="2.1" y1="4.9" x2="30.3" y2="24.2" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                ) : index === 1 ? (
                  <svg width="30" height="26" viewBox="0 0 34 29" fill="none">
                    <rect x="2" y="5" width="20" height="14" rx="2" stroke={strokeColor} strokeWidth="1.8" fill="none" />
                    <rect x="15" y="11" width="16" height="13" rx="2" stroke={strokeColor} strokeWidth="1.8" fill={isActive ? "rgba(250, 175, 63, 0.2)" : "none"} />
                    <line x1="8" y1="19" x2="15" y2="19" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ) : index === 2 ? (
                  <svg width="30" height="26" viewBox="0 0 34 29" fill="none">
                    <path d="M17 3L23 12L17 25L11 12L17 3Z" stroke={strokeColor} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
                    <line x1="11" y1="12" x2="23" y2="12" stroke={strokeColor} strokeWidth="1.4" />
                    <path d="M17 3L14 12L17 25L20 12L17 3Z" stroke={strokeColor} strokeWidth="1.2" fill="none" />
                  </svg>
                ) : (
                  <svg width="30" height="26" viewBox="0 0 34 29" fill="none">
                    <path d="M10 5H24L18 14.5L24 24H10L16 14.5L10 5Z" stroke={strokeColor} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
                    <line x1="8" y1="5" x2="26" y2="5" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
                    <line x1="8" y1="24" x2="26" y2="24" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
                    <path d="M14 19H20" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                )}
                <span style={{ fontSize: "10px", fontWeight: "500", color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.7)", lineHeight: "1.2", textAlign: "center" }}>
                  {feature.sFeatureName}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Coupon Code Section */}
        {showCouponInput && isActive && (
          <div
            className="spc-coupon-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: "16px",
              paddingTop: "14px",
              borderTop: "1px dashed rgba(250, 175, 63, 0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              width: "100%",
            }}
          >
            <label
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#FAAF3F",
                letterSpacing: "0.4px",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FAAF3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                <line x1="7" y1="7" x2="7.01" y2="7"></line>
              </svg>
              Have a Coupon Code?
            </label>

            <div style={{ display: "flex", gap: "8px", width: "100%" }}>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponError(null);
                  setCouponSuccess(null);
                }}
                placeholder="ENTER COUPON CODE"
                disabled={isVerifying}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(0, 0, 0, 0.4)",
                  border: couponError
                    ? "1px solid #ff4a4a"
                    : couponSuccess
                      ? "1px solid #4caf50"
                      : "1px solid rgba(250, 175, 63, 0.4)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: "600",
                  letterSpacing: "1px",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
              />
              <button
                type="button"
                onClick={handleVerifyCoupon}
                disabled={isVerifying || !couponCode.trim()}
                style={{
                  backgroundImage: "linear-gradient(24.95deg, #faaf3f 21.6%, #ffd691 49.5%, #faaf3f 81.7%)",
                  color: "#000000",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 16px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: isVerifying || !couponCode.trim() ? "not-allowed" : "pointer",
                  opacity: isVerifying || !couponCode.trim() ? 0.6 : 1,
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                }}
              >
                {isVerifying ? "Verifying..." : "Verify Code"}
              </button>
            </div>

            {couponError && (
              <span style={{ color: "#ff4a4a", fontSize: "12px", fontWeight: "500", marginTop: "2px" }}>
                {couponError}
              </span>
            )}

            {couponSuccess && (
              <span style={{ color: "#4caf50", fontSize: "12px", fontWeight: "500", marginTop: "2px" }}>
                {couponSuccess}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPlanCard;

interface SingleCouponInputProps {
  campaignId?: string;
  onSuccess?: (cleanCode: string, campaignRefId?: string) => void;
}

export const SingleCouponInput: React.FC<SingleCouponInputProps> = ({ campaignId, onSuccess }) => {
  const router = useRouter();
  const [couponCode, setCouponCode] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  const handleVerifyCoupon = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanCode = couponCode.trim();
    if (!cleanCode) {
      const errText = "Please enter a coupon code";
      setCouponError(errText);
      return;
    }

    if (isVerifying) return;
    setIsVerifying(true);
    setCouponError(null);
    setCouponSuccess(null);

    try {
      logger.info("[SingleCouponInput] Validating coupon code:", cleanCode);
      const response: any = await validateCode(cleanCode, campaignId || "");
      logger.info("[SingleCouponInput] Validation response:", response);

      const resData = response?.data?.data || response?.data || response;
      const metaData = response?.metaData || response?.["meta-data"] || {};
      const bIsEligible = resData?.bIsEligible ?? (metaData?.status === 200);

      const campaignDetails = resData?.campaignDetails || {};
      const campaignRefId =
        campaignDetails?.campaignRefId ||
        resData?.campaignRefId ||
        campaignDetails?.campaignId ||
        resData?.campaignId;

      if (bIsEligible !== false && (metaData?.status === 200 || metaData?.status === undefined || bIsEligible === true)) {
        const successMsg = resData?.sReason || metaData?.message || "Coupon code is valid and eligible";
        setCouponSuccess(successMsg);

        if (typeof window !== "undefined") {
          localStorage.removeItem("sCouponCode");
          // Save coupon code to sessionStorage so Payment page can display it
          sessionStorage.setItem("applied_coupon_code", cleanCode);
          if (campaignRefId) {
            sessionStorage.setItem("pending_campaign_id", campaignRefId);
          }
        }

        if (campaignRefId) {
          await fetchAndStoreCampaignPlan(campaignRefId, cleanCode);
        }

        setCouponCode("");

        if (onSuccess) {
          onSuccess(cleanCode, campaignRefId);
        } else {
          setTimeout(() => {
            router.push("/payment");
          }, 400);
        }
      } else {
        const errorMsg = resData?.sReason || metaData?.message || "Invalid or ineligible coupon code";
        setCouponError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      logger.error("[SingleCouponInput] Validation error:", err);
      const errorMsg =
        err?.response?.data?.["meta-data"]?.message ||
        err?.response?.data?.metaData?.message ||
        err?.response?.data?.data?.sReason ||
        err?.message ||
        "Invalid coupon code. Please try again.";
      setCouponError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      className="spc-coupon-container"
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        marginBottom: "24px",
        padding: "16px",
        borderRadius: "16px",
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(250, 175, 63, 0.3)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <label
        style={{
          fontSize: "12px",
          fontWeight: "600",
          color: "#FAAF3F",
          letterSpacing: "0.4px",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FAAF3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
          <line x1="7" y1="7" x2="7.01" y2="7"></line>
        </svg>
        Have a Coupon Code?
      </label>

      <div style={{ display: "flex", gap: "8px", width: "100%" }}>
        <input
          type="text"
          value={couponCode}
          onChange={(e) => {
            setCouponCode(e.target.value.toUpperCase());
            setCouponError(null);
            setCouponSuccess(null);
          }}
          placeholder="ENTER COUPON CODE"
          disabled={isVerifying}
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            border: couponError
              ? "1px solid #ff4a4a"
              : couponSuccess
                ? "1px solid #4caf50"
                : "1px solid rgba(250, 175, 63, 0.4)",
            borderRadius: "8px",
            padding: "10px 14px",
            color: "#FFFFFF",
            fontSize: "13px",
            fontWeight: "600",
            letterSpacing: "1px",
            outline: "none",
            transition: "border-color 0.2s ease",
          }}
        />
        <button
          type="button"
          onClick={handleVerifyCoupon}
          disabled={isVerifying || !couponCode.trim()}
          style={{
            backgroundImage: "linear-gradient(24.95deg, #faaf3f 21.6%, #ffd691 49.5%, #faaf3f 81.7%)",
            color: "#000000",
            border: "none",
            borderRadius: "8px",
            padding: "10px 16px",
            fontSize: "13px",
            fontWeight: "700",
            cursor: isVerifying || !couponCode.trim() ? "not-allowed" : "pointer",
            opacity: isVerifying || !couponCode.trim() ? 0.6 : 1,
            whiteSpace: "nowrap",
            transition: "all 0.2s ease",
          }}
        >
          {isVerifying ? "Verifying..." : "Verify Code"}
        </button>
      </div>

      {couponError && (
        <span style={{ color: "#ff4a4a", fontSize: "12px", fontWeight: "500", marginTop: "2px" }}>
          {couponError}
        </span>
      )}

      {couponSuccess && (
        <span style={{ color: "#4caf50", fontSize: "12px", fontWeight: "500", marginTop: "2px" }}>
          {couponSuccess}
        </span>
      )}
    </div>
  );
};

