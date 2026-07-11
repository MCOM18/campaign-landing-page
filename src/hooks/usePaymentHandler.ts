import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api from "../utils/apiClient";
import { AnalyticEvents } from "../services/analytics/AnalyticEvents";
import { getUserGeoLocation } from "../utils/userUtil";
import { logger } from "@/lib/logger/logger";
import { appConfig } from "@/lib/config/app.config";
import { trackEvent } from "@/services/analytics/events";
import { buildDevicePayload } from "@/shared/analytics/utils/buildDevicePayload";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PricingData {
  price: number;
  currency: string;
  currencySymbol: string;
  type: "SVOD" | "TVOD";
  skuId: string;
  pricing: any;
  billingCycle: string;
  duration: number;
  maxAmount?: number;
  offerId?: string | null;
}

interface PaymentInitData {
  ePaymentGateway: string;
  sToken: string;
  oOrderDetails: any;
  skuId: string;
  paymentMethod: string;
  expiresAt?: number;
  createdAt?: number;
  version?: string;
}

interface InitiateOptions {
  paymentMethod?: string;
  upiId?: string;
  card?: CardDetails;
}

interface CardDetails {
  number: string;
  month: string;
  year: string;
  cvv: string;
  name: string;
}

// Extend Window to include Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolves the correct pricing structure from any supported plan shape.
 */
export const getPricingData = (selectedPlan: any): PricingData | null => {
  if (!selectedPlan) return null;

  // Special offer plan: { oSubscriptionGroup: { aSubscriptionProducts: [{ aProviderSkus, oOfferDetails }] } }
  if (selectedPlan?.oSubscriptionGroup?.aSubscriptionProducts?.[0]) {
    const product = selectedPlan.oSubscriptionGroup.aSubscriptionProducts[0];
    const providerSku = product?.aProviderSkus?.[0];
    const pricing = providerSku?.oPricing;
    if (pricing) {
      return {
        price: pricing.nPrice,
        currency: pricing.sCurrency,
        currencySymbol: pricing.sCurrencySymbol,
        type: "SVOD",
        skuId: providerSku?.sUniqueSkuId,
        pricing,
        billingCycle: providerSku?.sBillingCycle || "yearly",
        duration: providerSku?.nDuration || 12,
        maxAmount: providerSku?.nMaxAmount || pricing.nPrice,
        offerId: product?.oOfferDetails?.sOfferId || providerSku?.oOfferDetails?.sOfferId || null,
      };
    }
  }

  // SVOD plan with providerSku
  if (selectedPlan?.providerSku?.oPricing) {
    return {
      price: selectedPlan.providerSku.oPricing.nPrice,
      currency: selectedPlan.providerSku.oPricing.sCurrency,
      currencySymbol: selectedPlan.providerSku.oPricing.sCurrencySymbol,
      type: "SVOD",
      skuId: selectedPlan.providerSku?.sUniqueSkuId,
      pricing: selectedPlan.providerSku.oPricing,
      billingCycle: selectedPlan.providerSku?.sBillingCycle || "monthly",
      duration: selectedPlan.providerSku?.nDuration || 1,
      maxAmount: selectedPlan.providerSku?.nMaxAmount || selectedPlan.providerSku.oPricing.nPrice * 12,
    };
  }

  // TVOD plan with pricing + aProviderSkus
  if (selectedPlan?.pricing) {
    const providerSku = selectedPlan?.aProviderSkus?.[0];
    const skuId = providerSku?.sUniqueSkuId;
    if (!skuId) {
      logger.warn("TVOD: sUniqueSkuId not found");
      return null;
    }
    return {
      price: selectedPlan.pricing.nPrice,
      currency: selectedPlan.pricing.sCurrency,
      currencySymbol: selectedPlan.pricing.sCurrencySymbol,
      type: "TVOD",
      skuId,
      pricing: selectedPlan.pricing,
      billingCycle: "one_time",
      duration: 1,
    };
  }

  // TVOD plan with aProviderSkus only
  if (selectedPlan?.aProviderSkus?.[0]?.oPricing) {
    const providerSku = selectedPlan.aProviderSkus[0];
    const pricing = providerSku.oPricing;
    return {
      price: pricing.nPrice,
      currency: pricing.sCurrency,
      currencySymbol: pricing.sCurrencySymbol,
      type: "TVOD",
      skuId: providerSku?.sUniqueSkuId,
      pricing,
      billingCycle: "one_time",
      duration: 1,
    };
  }

  logger.warn("No valid pricing structure found");
  return null;
};

/**
 * Dynamically loads the Razorpay checkout script.
 * Returns true immediately if already loaded.
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(false); return; }
    if (typeof window.Razorpay === "function") { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/razorpay.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const usePaymentHandler = () => {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserId(localStorage.getItem("user_id"));
      const profile = localStorage.getItem("selectedProfile");
      if (profile) {
        try { setSelectedProfile(JSON.parse(profile)); } catch { /* ignore */ }
      }

      // On page refresh / mount, clear the cached payment initiation details
      localStorage.removeItem("payment_init_data");
      localStorage.removeItem("payment_sToken");
      localStorage.removeItem("payment_sProviderToken");
    }
  }, []);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparedData, setPreparedData] = useState<PaymentInitData | null>(null);
  const [pollingAttempt, setPollingAttempt] = useState(0);
  const [showProcessingOverlay, setShowProcessingOverlay] = useState(false);
  const [overlayError, setOverlayError] = useState<string | null>(null);

  const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

  const POLLING_CONFIG = { MAX_ATTEMPTS: 10, RETRY_DELAY_MS: 2000 };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // ── LocalStorage helpers ───────────────────────────────────────────────────

  const setPaymentInitData = (data: PaymentInitData | null) => {
    try {
      if (data) {
        localStorage.setItem("payment_init_data", JSON.stringify({
          ...data,
          expiresAt: Date.now() + 30 * 60 * 1000,
          createdAt: Date.now(),
          version: "1.0",
        }));
      } else {
        localStorage.removeItem("payment_init_data");
      }
    } catch (error) {
      logger.error("Failed to store payment data:", error);
    }
  };

  const getPaymentInitData = (): PaymentInitData | null => {
    try {
      const raw = localStorage.getItem("payment_init_data");
      if (!raw) return null;
      const parsed: PaymentInitData & { expiresAt?: number } = JSON.parse(raw);
      if (!parsed.ePaymentGateway || !parsed.sToken) {
        localStorage.removeItem("payment_init_data");
        return null;
      }
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem("payment_init_data");
        return null;
      }
      return parsed;
    } catch (error) {
      logger.error("Failed to retrieve payment data:", error);
      localStorage.removeItem("payment_init_data");
      return null;
    }
  };

  // ── Cleanup ────────────────────────────────────────────────────────────────

  const cleanupPaymentState = () => {
    try {
      setPaymentInitData(null);
      localStorage.removeItem("payment_sToken");
      localStorage.removeItem("payment_sProviderToken");
      localStorage.removeItem("payment_status");
      localStorage.removeItem("payment_razorpay_id");
      localStorage.removeItem("payment_subscription_id");
      localStorage.removeItem("payment_order_id");
    } catch (error) {
      logger.error("Error during payment state cleanup:", error);
    }
    setIsProcessing(false);
    setIsPreparing(false);
    setPreparedData(null);
    setPollingAttempt(0);
    setShowProcessingOverlay(false);
    setOverlayError(null);
  };

  // ── Polling ────────────────────────────────────────────────────────────────

  const pollVerifyPayment = async (
    verifyPayload: any,
    maxAttempts = POLLING_CONFIG.MAX_ATTEMPTS,
    delayMs = POLLING_CONFIG.RETRY_DELAY_MS
  ) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      setPollingAttempt(attempt);
      try {
        const sessionId = localStorage.getItem("session_id");
        const response = await api.post("subscription/verify-payment", verifyPayload, {
          headers: { sessionid: sessionId || "" },
        });

        const verificationData = response.data?.data;
        const metaStatus = response.data?.["meta-data"]?.status;
        const sStatus = verificationData?.sStatus;

        if (sStatus === "SUCCESS" && metaStatus === 200) {
          setPollingAttempt(0);
          return { success: true, data: response.data };
        }
        if (sStatus === "FAILED") {
          setPollingAttempt(0);
          return { success: false, error: "Payment failed" };
        }
        if (sStatus === "CANCELLED") {
          setPollingAttempt(0);
          return { success: false, error: "Payment was cancelled" };
        }

        if (attempt < maxAttempts) {
          await sleep(delayMs);
          continue;
        }
      } catch (error) {
        logger.error(`Polling attempt ${attempt} failed:`, error);
        if (attempt < maxAttempts) {
          await sleep(delayMs);
          continue;
        }
      }
    }
    setPollingAttempt(0);
    return { success: false, timeout: true, error: "Payment verification timeout" };
  };

  // ── Payment success handler ────────────────────────────────────────────────

  const handlePaymentSuccess = async (
    razorpayResponse: any,
    selectedPlan: any,
    pricingData: PricingData,
    paymentMethod = "upi"
  ) => {
    const isSvodPayment = !pricingData?.type || pricingData?.type === "SVOD";

    if (isSvodPayment) {
      setShowProcessingOverlay(true);
      setOverlayError(null);
    }

    setPaymentInitData(null);
    localStorage.setItem("payment_status", "PENDING");

    const paymentId = razorpayResponse.razorpay_payment_id;
    localStorage.setItem("payment_razorpay_id", paymentId);
    localStorage.setItem("payment_order_id", razorpayResponse.razorpay_order_id);

    // Retrieve analytics parameters early for reuse in success/failure/error paths
    let campaignId = "";
    let campaignName = "";
    try {
      const rawCampaign = localStorage.getItem("campaign_decoded_data");
      if (rawCampaign) {
        const parsed = JSON.parse(rawCampaign);
        const decoded = parsed.decoded_data;
        campaignId = decoded?.campaign_id || decoded?.id || "";
        campaignName = decoded?.campaign_name || decoded?.name || decoded?.nameAnalytic || "";
      }
    } catch (e) {
      logger.warn("Failed to parse campaign details:", e);
    }
    const devicePayload = buildDevicePayload();
    const sessionId = localStorage.getItem("session_id") || "";

    try {
      const sToken = localStorage.getItem("payment_sToken");
      const sProviderToken = localStorage.getItem("payment_sProviderToken");

      if (!sToken || !sProviderToken) throw new Error("Missing payment tokens");

      const result = await pollVerifyPayment({
        ePaymentProvider: "RZP",
        sOrderId: paymentId,
        sProviderToken,
        sToken,
      });

      if (result.success) {
        const verificationData = result.data?.data;
        localStorage.setItem("payment_status", "SUCCESS");
        if (isSvodPayment) setShowProcessingOverlay(false);

        // Match initiated sToken against verify response
        let matchedType: string = pricingData?.type || "SVOD";
        let matchedRecord: any = null;

        if (verificationData && sToken) {
          if (verificationData.subscription?.sToken === sToken) {
            matchedType = "SVOD";
            matchedRecord = verificationData.subscription;
          } else if (Array.isArray(verificationData.oneTime)) {
            const tvodMatch = verificationData.oneTime.find((item: any) => item.sToken === sToken);
            if (tvodMatch) { matchedType = "TVOD"; matchedRecord = tvodMatch; }
          }
          if (!matchedRecord) {
            matchedType = verificationData.planType || pricingData?.type || "SVOD";
            matchedRecord = matchedType === "TVOD"
              ? verificationData.oneTime?.[0] || null
              : verificationData.subscription || null;
          }
        }

        // TVOD optimistic update (localStorage, no Redux)
        if (pricingData?.type === "TVOD" && selectedPlan?.assetId) {
          try {
            localStorage.setItem(`tvod_optimistic_${selectedPlan.assetId}`, JSON.stringify({
              validityDays: selectedPlan.nRentalValidityDays || selectedPlan.nInitialValidityDays || 30,
              purchaseAmount: pricingData.price,
              currency: pricingData.currency,
              paymentId,
            }));
          } catch (error) {
            logger.warn("Optimistic TVOD update failed:", error);
          }
        }

        // Analytics
        try {
          if (AnalyticEvents?.svodPurchaseSuccess && matchedType === "SVOD") {
            AnalyticEvents.svodPurchaseSuccess(selectedPlan, { user_id: userId }, "RAZORPAY", sToken, null);
          }
        } catch (error) {
          logger.warn("Analytics error:", error);
        }

        // Track new unified payment_success event
        try {
          trackEvent("payment_success", {
            payment_id: paymentId,
            order_id: razorpayResponse.razorpay_order_id,
            transaction_id: paymentId,
            amount: pricingData.price,
            currency: pricingData.currency,
            payment_method: paymentMethod,
            payment_provider: "Razorpay",
            campaign_id: campaignId,
            campaign_name: campaignName,
            user_id: userId || "",
            session_id: sessionId,
            device_type: devicePayload.device_type,
            platform: "web",
            timestamp: new Date().toISOString(),
            payment_status: "success",
          });
        } catch (analyticsErr) {
          logger.error("Failed to track payment success event:", analyticsErr);
        }

        localStorage.removeItem("payment_sToken");
        localStorage.removeItem("payment_sProviderToken");

        // Persist subscription data (replaces Redux updateSubscription)
        if (matchedType === "SVOD" && matchedRecord) {
          localStorage.setItem("subscriptionData", JSON.stringify({
            planType: verificationData?.planType || "SVOD",
            subscriptionData: matchedRecord,
          }));
        }

        localStorage.setItem("payment_success_state", JSON.stringify({
          planModel: selectedPlan,
          userData: { user_id: userId },
          paymentType: matchedType,
          matchedType,
          matchedRecord,
          verificationData,
          sToken,
        }));

        return { success: true };
      }

      // Verification failed
      localStorage.setItem("payment_status", "FAILED");
      const errorMessage = (result as any).error || "Payment verification failed";

      // Track new unified payment_failure event
      try {
        trackEvent("payment_failure", {
          payment_id: paymentId,
          order_id: razorpayResponse.razorpay_order_id,
          transaction_id: paymentId,
          amount: pricingData.price,
          currency: pricingData.currency,
          payment_method: paymentMethod,
          payment_provider: "Razorpay",
          failure_reason: errorMessage,
          error_code: "verification_failed",
          campaign_id: campaignId,
          campaign_name: campaignName,
          user_id: userId || "",
          session_id: sessionId,
          device_type: devicePayload.device_type,
          platform: "web",
          timestamp: new Date().toISOString(),
          payment_status: "failure",
        });
      } catch (analyticsErr) {
        logger.error("Failed to track payment failure (verification failed):", analyticsErr);
      }

      if (isSvodPayment) {
        setOverlayError(errorMessage);
        setTimeout(() => {
          setShowProcessingOverlay(false);
          setOverlayError(null);
        }, 2000);
      }
      return { success: false, error: errorMessage };

    } catch (err: unknown) {
      logger.error("Payment handling error:", err);
      localStorage.setItem("payment_status", "ERROR");
      const errorMessage = err instanceof Error ? err.message : "Payment verification failed";

      // Track new unified payment_failure event
      try {
        trackEvent("payment_failure", {
          payment_id: paymentId,
          order_id: razorpayResponse.razorpay_order_id,
          transaction_id: paymentId,
          amount: pricingData.price,
          currency: pricingData.currency,
          payment_method: paymentMethod,
          payment_provider: "Razorpay",
          failure_reason: errorMessage,
          error_code: "handling_error",
          campaign_id: campaignId,
          campaign_name: campaignName,
          user_id: userId || "",
          session_id: sessionId,
          device_type: devicePayload.device_type,
          platform: "web",
          timestamp: new Date().toISOString(),
          payment_status: "failure",
        });
      } catch (analyticsErr) {
        logger.error("Failed to track payment failure (handling error):", analyticsErr);
      }

      if (isSvodPayment) {
        setOverlayError(errorMessage);
        setTimeout(() => {
          setShowProcessingOverlay(false);
          setOverlayError(null);
        }, 2000);
      } else {
        toast.error(errorMessage);
      }
      return { success: false, error: errorMessage };
    }
  };

  // ── STEP 1: preparePayment ─────────────────────────────────────────────────
  // Call on page load / before button click (async — no gesture needed).
  // Also loads the Razorpay script so executePayment can run synchronously.

  const preparePayment = async (selectedPlan: any, paymentMethod: string): Promise<PaymentInitData | null> => {
    try {
      setIsPreparing(true);

      const pricingData = getPricingData(selectedPlan);
      if (!pricingData) throw new Error("Invalid pricing");

      // Pre-load Razorpay script while we're already in async territory
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Failed to load Razorpay SDK. Please check your network and try again.");

      // Use cache if same SKU and same payment method
      const cached = getPaymentInitData();
      if (cached?.oOrderDetails && cached?.skuId === pricingData.skuId && cached?.paymentMethod === paymentMethod) {
        setPreparedData(cached);
        setIsPreparing(false);
        return cached;
      }

      setPaymentInitData(null);

      const userPhone = localStorage.getItem("user_phone") || selectedProfile?.sPhone || "";
      const userPhoneCode = localStorage.getItem("user_phone_code") || selectedProfile?.sPhoneCode || appConfig.DEFAULT_MOBILE_NUMBER_CODE;
      const currentGeoData = getUserGeoLocation();

      const payload = {
        iProviderSkuId: pricingData.skuId,
        nAmount: pricingData.price,
        sCity: currentGeoData?.city || "",
        sCountryCode2: currentGeoData?.country_code || appConfig.DEFAULT_COUNTRY_NAME,
        sCurrencyCode: pricingData.currency || "INR",
        sState: currentGeoData?.region || "",
        sUserId: userId || "",
        sPaymentMethod: paymentMethod,
        sPhone: userPhone,
        sPhoneCode: userPhoneCode,
        sOfferId: pricingData.offerId ||
          selectedPlan?.providerSku?.oOfferDetails?.sOfferId ||
          selectedPlan?.oSubscriptionGroup?.aSubscriptionProducts?.[0]?.oOfferDetails?.sOfferId ||
          selectedPlan?.oSubscriptionGroup?.aSubscriptionProducts?.[0]?.aProviderSkus?.[0]?.oOfferDetails?.sOfferId ||
          null,
        sEmail: localStorage.getItem("user_email") || null,
      };

      const sessionId = localStorage.getItem("session_id");
      const response: any = await api.post("subscription/initiate-payment", payload, {
        headers: { sessionid: sessionId || "" },
      });

      logger.info("Initiate Payment Response:", response);

      const newInitiateData = response?.data?.data?.initiateData || response?.data?.initiateData || response?.initiateData;
      if (!newInitiateData) {
        throw new Error(`Invalid initiate response: ${JSON.stringify(response?.data || response)}`);
      }

      localStorage.setItem("payment_sToken", newInitiateData.sToken);
      localStorage.setItem("payment_sProviderToken", newInitiateData.sProviderToken);

      const data: PaymentInitData = {
        ePaymentGateway: newInitiateData?.ePaymentProvider,
        sToken: newInitiateData?.sToken,
        oOrderDetails: newInitiateData?.oOrderDetails,
        skuId: pricingData.skuId,
        paymentMethod: paymentMethod,
      };

      setPaymentInitData(data);
      setPreparedData(data);
      setIsPreparing(false);
      return data;
    } catch (err: unknown) {
      logger.error("preparePayment failed:", err);
      setIsPreparing(false);
      const isAlreadyActive = err instanceof Error && err.message === "Your subscription plan is already active";
      if (isAlreadyActive) {
        return { isAlreadyActive: true } as any;
      }
      toast.error(err instanceof Error ? err.message : "Failed to prepare payment. Please try again.");
      return null;
    }
  };

  // ── STEP 2: executePayment ─────────────────────────────────────────────────
  // Call synchronously inside the button click handler.
  // No await here — createPayment must fire within the same user gesture tick.

  const executePayment = (
    selectedPlan: any, paymentMethod: string, paymentDetails: any, pricingData: PricingData, initiateData: PaymentInitData, intentApp?: string, p0?: () => void): Promise<any> => {
    return new Promise((resolve, reject) => {
      try {
        // Script must already be loaded by preparePayment
        if (typeof window.Razorpay !== "function") {
          reject(new Error("Razorpay is not available. Please tap 'Pay' again."));
          return;
        }

        const orderDetails = initiateData.oOrderDetails;
        const notes = orderDetails?.notes || {};

        const paymentData: Record<string, any> = {
          amount: orderDetails.amount,
          currency: orderDetails.currency || "INR",
          order_id: orderDetails.order_id,
          email: notes.email || localStorage.getItem("user_email") || "customer@razorpay.com",
          contact: notes.contact || localStorage.getItem("user_phone") || "9999999999",
        };
        logger.info("sunil payment dataa. paymentData", paymentData)
        if (orderDetails.customer_id) paymentData.customer_id = orderDetails.customer_id;
        if (pricingData?.type === "SVOD") paymentData.recurring = 1;

        if (paymentMethod === "upi") {
          paymentData.method = "upi";
          if (intentApp) {
            paymentData.upi = { flow: "intent" };
            // Note: `recurring = 1` is already set above if SVOD
          } else {
            paymentData.vpa = paymentDetails.upiId;
          }
        } else if (paymentMethod === "card") {
          paymentData.method = "card";
          paymentData["card[number]"] = paymentDetails.card.number.replace(/\s/g, "");
          paymentData["card[expiry_month]"] = paymentDetails.card.month;
          paymentData["card[expiry_year]"] = paymentDetails.card.year;
          paymentData["card[cvv]"] = paymentDetails.card.cvv;
          paymentData["card[name]"] = paymentDetails.card.name;
        }

        // Synchronous construction — preserves user gesture ✅
        const rzp = new window.Razorpay({ key: RAZORPAY_KEY });

        if (typeof rzp.createPayment !== "function") {
          reject(new Error("Razorpay createPayment not available. Please refresh and try again."));
          return;
        }



        rzp.on("payment.success", async (response: any) => {
          console.log("Successs---->> response---->>", response)
          toast.success("Payment successful! Verifying...");
          window.alert("Congratulation! Payment successful.");
          await handlePaymentSuccess({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          }, selectedPlan, pricingData, paymentMethod);
          resolve({ success: true });
        });

        rzp.on("payment.error", (error: any) => {
          const errPayload = error instanceof Error ? error.message : JSON.stringify(error);
          logger.error(`Payment error: ${errPayload}`);
          const msg = error?.error?.description || error?.error?.reason || "Payment failed. Please try again.";
          toast.error(msg);
          window.alert("Payment failed: " + msg);
          setIsProcessing(false);

          // Track new unified payment_failure event
          try {
            const rawCampaign = localStorage.getItem("campaign_decoded_data");
            let campaignId = "";
            let campaignName = "";
            if (rawCampaign) {
              const parsed = JSON.parse(rawCampaign);
              const decoded = parsed.decoded_data;
              campaignId = decoded?.campaign_id || decoded?.id || "";
              campaignName = decoded?.campaign_name || decoded?.name || decoded?.nameAnalytic || "";
            }

            const devicePayload = buildDevicePayload();
            const sessionId = localStorage.getItem("session_id") || "";
            const errPaymentId = error?.error?.metadata?.payment_id || error?.metadata?.payment_id;
            const errOrderId = error?.error?.metadata?.order_id || error?.metadata?.order_id || orderDetails?.order_id;
            const errCode = error?.error?.code || error?.code;

            trackEvent("payment_failure", {
              payment_id: errPaymentId || null,
              order_id: errOrderId || null,
              transaction_id: errPaymentId || null,
              amount: pricingData.price,
              currency: pricingData.currency,
              payment_method: paymentMethod,
              payment_provider: "Razorpay",
              failure_reason: msg,
              error_code: errCode ? String(errCode) : null,
              campaign_id: campaignId,
              campaign_name: campaignName,
              user_id: userId || "",
              session_id: sessionId,
              device_type: devicePayload.device_type,
              platform: "web",
              timestamp: new Date().toISOString(),
              payment_status: "failure",
            });
          } catch (analyticsErr) {
            logger.error("Failed to track payment failure (checkout error):", analyticsErr);
          }

          reject(new Error(msg));
        });

        logger.info("jadiya no payment dataa. paymentData", paymentData)
        if (intentApp && intentApp !== "any") {
          rzp.createPayment(paymentData, { app: intentApp });
        } else {
          rzp.createPayment(paymentData);
        }
      } catch (error) {
        logger.error("executePayment error:", error);

        // Track new unified payment_failure event
        try {
          const rawCampaign = localStorage.getItem("campaign_decoded_data");
          let campaignId = "";
          let campaignName = "";
          if (rawCampaign) {
            const parsed = JSON.parse(rawCampaign);
            const decoded = parsed.decoded_data;
            campaignId = decoded?.campaign_id || decoded?.id || "";
            campaignName = decoded?.campaign_name || decoded?.name || decoded?.nameAnalytic || "";
          }

          const devicePayload = buildDevicePayload();
          const sessionId = localStorage.getItem("session_id") || "";

          trackEvent("payment_failure", {
            payment_id: null,
            order_id: initiateData?.oOrderDetails?.order_id || null,
            transaction_id: null,
            amount: pricingData.price,
            currency: pricingData.currency,
            payment_method: paymentMethod,
            payment_provider: "Razorpay",
            failure_reason: error instanceof Error ? error.message : "Execution error",
            error_code: "execution_error",
            campaign_id: campaignId,
            campaign_name: campaignName,
            user_id: userId || "",
            session_id: sessionId,
            device_type: devicePayload.device_type,
            platform: "web",
            timestamp: new Date().toISOString(),
            payment_status: "failure",
          });
        } catch (analyticsErr) {
          logger.error("Failed to track payment failure (execute error):", analyticsErr);
        }

        reject(error);
      }
    });
  };

  // ── initiatePayment (backward compat) ─────────────────────────────────────

  const initiatePayment = async (selectedPlan: any, options: InitiateOptions = {}): Promise<any> => {
    try {
      setIsProcessing(true);

      const pricingData = getPricingData(selectedPlan);
      if (!pricingData) {
        toast.error("Invalid pricing");
        setIsProcessing(false);
        return { success: false, error: "Invalid pricing" };
      }

      let initiateData: PaymentInitData | null = preparedData || getPaymentInitData();
      if (!initiateData?.oOrderDetails) {
        initiateData = await preparePayment(selectedPlan, options?.paymentMethod || "upi");
        if (!initiateData) {
          setIsProcessing(false);
          return { success: false, error: "Failed to prepare payment" };
        }
        if ((initiateData as any).isAlreadyActive) {
          setIsProcessing(false);
          return { success: false, error: "Your subscription plan is already active", isAlreadyActive: true };
        }
      }

      const result = await executePayment(
        selectedPlan,
        options?.paymentMethod || "upi",
        { upiId: options?.upiId, card: options?.card },
        pricingData,
        initiateData
      );
      return result;

    } catch (err: unknown) {
      logger.error("Payment initiation failed:", err);
      toast.error(err instanceof Error ? err.message : "Payment failed");
      setIsProcessing(false);

      // Track new unified payment_failure event
      try {
        const rawCampaign = localStorage.getItem("campaign_decoded_data");
        let campaignId = "";
        let campaignName = "";
        if (rawCampaign) {
          const parsed = JSON.parse(rawCampaign);
          const decoded = parsed.decoded_data;
          campaignId = decoded?.campaign_id || decoded?.id || "";
          campaignName = decoded?.campaign_name || decoded?.name || decoded?.nameAnalytic || "";
        }

        const devicePayload = buildDevicePayload();
        const sessionId = localStorage.getItem("session_id") || "";
        const pricing = selectedPlan ? getPricingData(selectedPlan) : null;

        trackEvent("payment_failure", {
          payment_id: null,
          order_id: null,
          transaction_id: null,
          amount: pricing?.price || null,
          currency: pricing?.currency || null,
          payment_method: options?.paymentMethod || "upi",
          payment_provider: "Razorpay",
          failure_reason: err instanceof Error ? err.message : "Initiation error",
          error_code: "initiation_error",
          campaign_id: campaignId,
          campaign_name: campaignName,
          user_id: userId || "",
          session_id: sessionId,
          device_type: devicePayload.device_type,
          platform: "web",
          timestamp: new Date().toISOString(),
          payment_status: "failure",
        });
      } catch (analyticsErr) {
        logger.error("Failed to track payment failure (initiate error):", analyticsErr);
      }

      return { success: false, error: err instanceof Error ? err.message : "Payment failed" };
    }
  };

  return {
    preparePayment,
    executePayment,
    initiatePayment,
    isProcessing,
    isPreparing,
    preparedData,
    pollingAttempt,
    cleanupPaymentState,
    showPaymentDetailsModal: false,
    setShowPaymentDetailsModal: () => { },
    showCardTypeMismatchModal: false,
    setShowCardTypeMismatchModal: () => { },
    mismatchCardType: "",
    setMismatchCardType: () => { },
    showProcessingOverlay,
    overlayError,
  };
};

// ─── Card recurring eligibility check ────────────────────────────────────────

export const checkCardRecurringEligibility = async (
  cardNumber: string
): Promise<{ eligible: boolean; error: string | null; cardDetails: any }> => {
  try {
    const iin = cardNumber.replace(/\s/g, "").slice(0, 6);
    if (iin.length < 6) {
      return { eligible: false, error: "Please enter a valid card number", cardDetails: null };
    }

    const sessionId = localStorage.getItem("session_id") || "";
    if (!sessionId) return { eligible: true, error: null, cardDetails: null };

    const response = await api.post(
      "subscription/check-card-recurring-eligibility",
      { iin },
      { headers: { sessionid: sessionId } }
    );

    const cardDetails = (response as any).data?.data?.oCardDetails
      || (response as any).data?.oCardDetails
      || null;

    if (!cardDetails) return { eligible: true, error: null, cardDetails: null };

    if (cardDetails?.recurring?.available !== true) {
      return {
        eligible: false,
        error: "This card does not support recurring payments. Please use a different card.",
        cardDetails,
      };
    }

    return { eligible: true, error: null, cardDetails };

  } catch (err: unknown) {
    logger.warn("Card eligibility check failed, proceeding with payment:", err instanceof Error ? err.message : err);
    return { eligible: true, error: null, cardDetails: null };
  }
};

export default usePaymentHandler;
