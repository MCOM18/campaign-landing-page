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
    };

    // ── Special offer plan shape ──────────────────────────────────────────────
    // plan.oSubscriptionGroup.aSubscriptionProducts[0]
    if (plan?.oSubscriptionGroup?.aSubscriptionProducts?.[0]) {
      const product  = plan.oSubscriptionGroup.aSubscriptionProducts[0];
      const providerSku = product?.aProviderSkus?.[0];
      const offer    = product?.oOfferDetails;

      return {
        name:            plan.oSubscriptionGroup.oGroupTranslation?.sName,
        subLabel:        product.sSubProductLabel || null,
        price:           providerSku?.oPricing?.nPrice !== undefined
                           ? `${providerSku.oPricing.sCurrencySymbol}${providerSku.oPricing.nPrice}`
                           : "Price not available",
        priceRaw:        providerSku?.oPricing?.nPrice ?? null,
        currencySymbol:  providerSku?.oPricing?.sCurrencySymbol || "₹",
        validity:        product.nValidityDays,
        isFreeTrial:     offer?.eOfferDiscountType === "FREE_TRIAL",
        trialDays:       offer?.nValidityCount ?? null,
        trialUnit:       offer?.sValidityDuration || "day",
        offerId:         offer?.sOfferId || null,
        providerOfferId: providerSku?.sProviderOfferId || null,
        discount:        null,
        features:        product?.aFeatures || [],
      };
    }

    // ── SVOD plan with providerSku ────────────────────────────────────────────
    if (plan.providerSku?.oPricing) {
      return {
        name:            plan.oProductTranslation?.sName || plan.sName || "Subscription Plan",
        subLabel:        plan.sSubProductLabel || plan.providerSku?.sSubProductLabel || null,
        price:           plan.sAltPrice || plan.sFormattedPrice ||
                           `${plan.providerSku.oPricing.sCurrencySymbol}${plan.providerSku.oPricing.nPrice}`,
        priceRaw:        plan.providerSku.oPricing.nPrice,
        currencySymbol:  plan.providerSku.oPricing.sCurrencySymbol || "₹",
        validity:        plan.nValidity || null,
        isFreeTrial:     false,
        trialDays:       null,
        trialUnit:       null,
        offerId:         null,
        providerOfferId: null,
        discount:        plan.sDiscount || null,
        features:        plan.aFeatures || [],
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
      };
    }

    return {
      name: "Plan", subLabel: null, price: "Price not available",
      priceRaw: null, currencySymbol: "₹", validity: null,
      isFreeTrial: false, trialDays: null, trialUnit: null,
      offerId: null, providerOfferId: null, discount: null, features: [],
    };
  };

  const displayData = getPlanDisplayData(plan);

  const isFreeTrial = displayData.isFreeTrial && displayData.trialDays;

  // Normalize billing period for subtitle
  let period = displayData.subLabel || `${displayData.validity} days`;
  if (period === "12 Months" || displayData.validity === 365) {
    period = "year";
  }

  return (
    <div className="spc-wrapper">
      <div
        onClick={onClick}
        className={`spc-box${isActive ? " spc-box--active" : " spc-box--default"}`}
      >
        {isFreeTrial && (
          <div style={{ marginBottom: "12px", display: "flex" }}>
            <span className="spc-badge-trial">
              {displayData.trialDays} {displayData.trialUnit === "day" ? "DAYS" : displayData.trialUnit.toUpperCase()} FREE
            </span>
          </div>
        )}

        {/* Plan name + price row */}
        <div className="spc-row" style={{ alignItems: "center" }}>
          <div className="spc-left">
            <span className="spc-name" style={{ fontSize: "17px", fontWeight: "700" }}>
              {displayData.subLabel || displayData.name}
            </span>
          </div>
          <div className="spc-right" style={{ alignItems: "center" }}>
            <span className="spc-price">{displayData.price}</span>
          </div>
        </div>

        {/* Free trial subtitle */}
        {isFreeTrial && (
          <p className="spc-trial-note">
            Free for {displayData.trialDays} {displayData.trialUnit}s, then {displayData.price}/{period}. Cancel anytime.
          </p>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPlanCard;
