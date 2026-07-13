import React from "react";
import "./payment.css";

interface SubscriptionPlanCardProps {
  plan: any;
  isActive?: boolean;
  onClick?: () => void;
  landscapeUrl?: string | null;
  isSelectionScreen?: boolean;
}

const SubscriptionPlanCard: React.FC<SubscriptionPlanCardProps> = ({
  plan,
  isActive = false,
  onClick,
  landscapeUrl = null,
  isSelectionScreen = false,
}) => {
  const getPlanDisplayData = (plan: any) => {
    if (!plan) return {
      name: "Plan", subLabel: null, price: "Price not available",
      priceRaw: null, currencySymbol: "₹", validity: null,
      isFreeTrial: false, trialDays: null, trialUnit: null,
      offerId: null, providerOfferId: null, discount: null, features: [],
      offerDisclaimer: null,
    };

    // ── Special offer plan shape ──────────────────────────────────────────────
    // plan.oSubscriptionGroup.aSubscriptionProducts[0]
    if (plan?.oSubscriptionGroup?.aSubscriptionProducts?.[0]) {
      const product  = plan.oSubscriptionGroup.aSubscriptionProducts[0];
      const providerSku = product?.aProviderSkus?.[0];
      const offer    = product?.oOfferDetails || providerSku?.oOfferDetails;

      return {
        name:            plan.oSubscriptionGroup.oGroupTranslation?.sName,
        subLabel:        product.sSubProductLabel || null,
        price:           providerSku?.oPricing?.nPrice !== undefined
                           ? `${providerSku.oPricing.sCurrencySymbol}${providerSku.oPricing.nPrice}`
                           : "Price not available",
        priceRaw:        providerSku?.oPricing?.nPrice ?? null,
        currencySymbol:  providerSku?.oPricing?.sCurrencySymbol || "₹",
        validity:        product.nValidityDays,
        isFreeTrial:     !!offer,
        trialDays:       offer?.nValidityCount ?? null,
        trialUnit:       offer?.sValidityDuration || "day",
        offerId:         offer?.sOfferId || null,
        providerOfferId: providerSku?.sProviderOfferId || null,
        discount:        null,
        features:        product?.aFeatures || [],
        offerDisclaimer: offer?.oOfferTranslation?.sOfferDisclaimer || null,
      };
    }

    // ── SVOD plan with providerSku ────────────────────────────────────────────
    if (plan.providerSku?.oPricing) {
      const offer = plan.providerSku?.oOfferDetails;
      return {
        name:            plan.oProductTranslation?.sName || plan.sName || "Subscription Plan",
        subLabel:        plan.sSubProductLabel || plan.providerSku?.sSubProductLabel || null,
        price:           plan.sAltPrice || plan.sFormattedPrice ||
                           `${plan.providerSku.oPricing.sCurrencySymbol}${plan.providerSku.oPricing.nPrice}`,
        priceRaw:        plan.providerSku.oPricing.nPrice,
        currencySymbol:  plan.providerSku.oPricing.sCurrencySymbol || "₹",
        validity:        plan.nValidity || null,
        isFreeTrial:     !!offer,
        trialDays:       offer?.nValidityCount ?? null,
        trialUnit:       offer?.sValidityDuration || "day",
        offerId:         offer?.sOfferId || null,
        providerOfferId: plan.providerSku?.sProviderOfferId || null,
        discount:        plan.sDiscount || null,
        features:        plan.aFeatures || [],
        offerDisclaimer: offer?.oOfferTranslation?.sOfferDisclaimer || null,
      };
    }

    // ── TVOD ──────────────────────────────────────────────────────────────────
    if (plan.oProductTranslation || plan.pricing) {
      return {
        name:            plan.oProductTranslation?.sName || plan.oProductTranslation?.sTitle || "Premium Content",
        subLabel:        null,
        price:           plan.pricing
                           ? `${plan.pricing.sCurrencySymbol}${plan.pricing.nPrice}`
                           : "Price not available",
        priceRaw:        plan.pricing?.nPrice ?? null,
        currencySymbol:  plan.pricing?.sCurrencySymbol || "₹",
        validity:        plan.nInitialValidityDays || null,
        isFreeTrial:     false,
        trialDays:       null,
        trialUnit:       null,
        offerId:         null,
        providerOfferId: null,
        discount:        null,
        features:        plan.aFeatures || [],
        offerDisclaimer: null,
      };
    }

    return {
      name: "Plan", subLabel: null, price: "Price not available",
      priceRaw: null, currencySymbol: "₹", validity: null,
      isFreeTrial: false, trialDays: null, trialUnit: null,
      offerId: null, providerOfferId: null, discount: null, features: [],
      offerDisclaimer: null,
    };
  };

  const displayData = getPlanDisplayData(plan);

  const isFreeTrial = !!(displayData.isFreeTrial && displayData.trialDays);

  // Normalize billing period for subtitle
  let period = displayData.subLabel || `${displayData.validity} days`;
  if (period === "12 Months" || displayData.validity === 365) {
    period = "year";
  }

  let disclaimerText = "";
  if (isFreeTrial) {
    if (displayData.offerDisclaimer) {
      disclaimerText = displayData.offerDisclaimer
        .replace("{sCurrencySymbol}", displayData.currencySymbol || "₹")
        .replace("{nPrice}", displayData.priceRaw?.toString() || "");
    } else {
      disclaimerText = `Free for ${displayData.trialDays} ${displayData.trialUnit}s, then ${displayData.price}/${period}. Cancel anytime.`;
    }
  }

  // Determine styles for free trial card
  const trialBoxStyle: React.CSSProperties = isFreeTrial
    ? {
        background: isActive
          ? "linear-gradient(44.13deg, #FAAF3F 21.63%, #FFD691 49.52%, #FAAF3F 81.68%)"
          : "rgba(30, 30, 30, 0.9)",
        border: isActive ? "none" : "1.5px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "24px",
        padding: "24px 26px",
        boxShadow: isActive ? "0 10px 30px rgba(250, 175, 63, 0.3)" : "none",
        transition: "all 0.2s ease",
      }
    : {};

  const nameStyle: React.CSSProperties = isFreeTrial
    ? {
        fontSize: "24px",
        fontWeight: "800",
        color: isActive ? "#111111" : "#ffffff",
        fontFamily: "inherit",
      }
    : {
        fontSize: "17px",
        fontWeight: "700",
      };

  const priceStyle: React.CSSProperties = isFreeTrial
    ? {
        fontSize: "24px",
        fontWeight: "800",
        color: isActive ? "#111111" : "#ffffff",
        fontFamily: "inherit",
      }
    : {};

  const trialBadgeStyle: React.CSSProperties = {
    backgroundColor: isActive ? "#111111" : "rgba(255, 255, 255, 0.08)",
    color: isActive ? "#FAAF3F" : "#FAAF3F",
    borderRadius: "100px",
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    display: "inline-block",
  };

  const trialNoteStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: "500",
    color: isActive ? "rgba(17, 17, 17, 0.85)" : "rgba(255, 255, 255, 0.6)",
    marginTop: "12px",
    lineHeight: "1.4",
  };

  return (
    <div className="spc-wrapper">
      <div
        onClick={onClick}
        className={`spc-box${isActive ? " spc-box--active" : " spc-box--default"}`}
        style={trialBoxStyle}
      >
        {isFreeTrial && (
          <div style={{ marginBottom: "12px", display: "flex" }}>
            <span style={trialBadgeStyle}>
              {displayData.trialDays} {displayData.trialUnit === "day" ? "DAYS" : displayData.trialUnit.toUpperCase()} FREE
            </span>
          </div>
        )}

        {/* Plan name row */}
        <div className="spc-row" style={{ alignItems: "center" }}>
          <div className="spc-left">
            <span className="spc-name" style={nameStyle}>
              {displayData.subLabel || displayData.name}
            </span>
          </div>
          {!isFreeTrial && displayData.price && (
            <div className="spc-right">
              <span className="spc-price" style={priceStyle}>
                {displayData.price}
              </span>
            </div>
          )}
        </div>

        {/* Free trial subtitle */}
        {isFreeTrial && (
          <p style={trialNoteStyle}>
            {disclaimerText}
          </p>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPlanCard;
