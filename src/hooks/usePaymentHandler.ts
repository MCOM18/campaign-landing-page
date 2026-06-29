import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api from "../utils/apiClient";
import { AnalyticEvents } from "../analytics/AnalyticEvents";
import { getUserGeoLocation } from "../utils/userUtil";

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
        offerId: product?.oOfferDetails?.sOfferId || null,
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
      console.warn("TVOD: sUniqueSkuId not found");
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

  console.warn("No valid pricing structure found");
  return null;
};

/**
 * Dynamically loads the Razorpay checkout script.
 * Returns true immediately if already loaded.
 */
const loadRazorpayScript = (): Promise<boolean> => {
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
      console.error("Failed to store payment data:", error);
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
      console.error("Failed to retrieve payment data:", error);
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
      sessionStorage.removeItem("payment_status");
      sessionStorage.removeItem("payment_razorpay_id");
      sessionStorage.removeItem("payment_subscription_id");
      sessionStorage.removeItem("payment_order_id");
    } catch (error) {
      console.error("Error during payment state cleanup:", error);
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
        console.error(`Polling attempt ${attempt} failed:`, error);
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
    pricingData: PricingData
  ) => {
    const isSvodPayment = !pricingData?.type || pricingData?.type === "SVOD";

    if (isSvodPayment) {
      setShowProcessingOverlay(true);
      setOverlayError(null);
    }

    setPaymentInitData(null);
    sessionStorage.setItem("payment_status", "PENDING");

    const paymentId = razorpayResponse.razorpay_payment_id;
    sessionStorage.setItem("payment_razorpay_id", paymentId);
    sessionStorage.setItem("payment_order_id", razorpayResponse.razorpay_order_id);

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
        sessionStorage.setItem("payment_status", "SUCCESS");
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
            console.warn("Optimistic TVOD update failed:", error);
          }
        }

        // Analytics
        try {
          if (AnalyticEvents?.svodPurchaseSuccess && matchedType === "SVOD") {
            AnalyticEvents.svodPurchaseSuccess(selectedPlan, { user_id: userId }, "RAZORPAY", sToken, null);
          }
        } catch (error) {
          console.warn("Analytics error:", error);
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

        sessionStorage.setItem("payment_success_state", JSON.stringify({
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
      sessionStorage.setItem("payment_status", "FAILED");
      const errorMessage = (result as any).error || "Payment verification failed";

      if (isSvodPayment) {
        setOverlayError(errorMessage);
        setTimeout(() => {
          setShowProcessingOverlay(false);
          setOverlayError(null);
          sessionStorage.setItem("payment_failed_state", JSON.stringify({ error: errorMessage, planModel: selectedPlan }));
          router.push("/payment-failed");
        }, 2000);
      } else {
        sessionStorage.setItem("payment_failed_state", JSON.stringify({ error: errorMessage, planModel: selectedPlan }));
        router.push("/payment-failed");
      }
      return { success: false, error: errorMessage };

    } catch (err: unknown) {
      console.error("Payment handling error:", err);
      sessionStorage.setItem("payment_status", "ERROR");
      const errorMessage = err instanceof Error ? err.message : "Payment verification failed";

      if (isSvodPayment) {
        setOverlayError(errorMessage);
        setTimeout(() => {
          setShowProcessingOverlay(false);
          setOverlayError(null);
          toast.error(errorMessage);
          sessionStorage.setItem("payment_failed_state", JSON.stringify({ error: errorMessage, planModel: selectedPlan }));
          router.push("/payment-failed");
        }, 2000);
      } else {
        toast.error(errorMessage);
        sessionStorage.setItem("payment_failed_state", JSON.stringify({ error: errorMessage, planModel: selectedPlan }));
        router.push("/payment-failed");
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

      // Use cache if same SKU
      const cached = getPaymentInitData();
      if (cached?.oOrderDetails && cached?.skuId === pricingData.skuId) {
        setPreparedData(cached);
        setIsPreparing(false);
        return cached;
      }

      setPaymentInitData(null);

      const userPhone = localStorage.getItem("user_phone") || selectedProfile?.sPhone || "";
      const userPhoneCode = localStorage.getItem("user_phone_code") || selectedProfile?.sPhoneCode || "+91";
      const currentGeoData = getUserGeoLocation();

      const payload = {
        iProviderSkuId: pricingData.skuId,
        nAmount: pricingData.price,
        sCity: currentGeoData?.city || "",
        sCountryCode2: currentGeoData?.country_code || "IN",
        sCurrencyCode: pricingData.currency || "INR",
        sState: currentGeoData?.region || "",
        sUserId: userId || "",
        sPaymentMethod: paymentMethod,
        sPhone: userPhone,
        sPhoneCode: userPhoneCode,
        sOfferId: pricingData.offerId ||
          selectedPlan?.providerSku?.oOfferDetails?.sOfferId ||
          selectedPlan?.oSubscriptionGroup?.aSubscriptionProducts?.[0]?.oOfferDetails?.sOfferId ||
          null,
        sEmail: localStorage.getItem("user_email") || null,
      };

      const sessionId = localStorage.getItem("session_id");
      const response = await api.post("subscription/initiate-payment", payload, {
        headers: { sessionid: sessionId || "" },
      });

      const newInitiateData = response?.data?.data?.initiateData;
      if (!newInitiateData) throw new Error("Invalid initiate response");

      localStorage.setItem("payment_sToken", newInitiateData.sToken);
      localStorage.setItem("payment_sProviderToken", newInitiateData.sProviderToken);

      const data: PaymentInitData = {
        ePaymentGateway: newInitiateData?.ePaymentProvider,
        sToken: newInitiateData?.sToken,
        oOrderDetails: newInitiateData?.oOrderDetails,
        skuId: pricingData.skuId,
      };

      setPaymentInitData(data);
      setPreparedData(data);
      setIsPreparing(false);
      return data;
    } catch (err: unknown) {
      console.error("preparePayment failed:", err);
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
    selectedPlan: any,
    paymentMethod: string,
    paymentDetails: any,
    pricingData: PricingData,
    initiateData: PaymentInitData
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      try {
        // Script must already be loaded by preparePayment
        if (typeof window.Razorpay !== "function") {
          reject(new Error("Razorpay is not available. Please tap 'Pay' again."));
          return;
        }

        const orderDetails = initiateData.oOrderDetails;
        const notes = orderDetails?.notes || {};

        const options: Record<string, any> = {
          amount: orderDetails.amount,
          currency: orderDetails.currency || "INR",
          order_id: orderDetails.order_id,
          email: notes.email || "customer@razorpay.com",
          contact: notes.contact || "",
        };

        if (orderDetails.customer_id) options.customer_id = orderDetails.customer_id;
        if (pricingData?.type === "SVOD") options.recurring = 1;

        if (paymentMethod === "upi") {
          options.method = "upi";
          options.vpa = paymentDetails.upiId;
        } else if (paymentMethod === "card") {
          options.method = "card";
          options["card[number]"] = paymentDetails.card.number.replace(/\s/g, "");
          options["card[expiry_month]"] = paymentDetails.card.month;
          options["card[expiry_year]"] = paymentDetails.card.year;
          options["card[cvv]"] = paymentDetails.card.cvv;
          options["card[name]"] = paymentDetails.card.name;
        }

        // Synchronous construction — preserves user gesture ✅
        const rzp = new window.Razorpay({
          key: RAZORPAY_KEY,
          id: orderDetails.order_id,
        });

        if (typeof rzp.createPayment !== "function") {
          reject(new Error("Razorpay createPayment not available. Please refresh and try again."));
          return;
        }

        rzp.createPayment(options);

        rzp.on("payment.success", async (response: any) => {
          toast.success("Payment successful! Verifying...");
          await handlePaymentSuccess({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          }, selectedPlan, pricingData);
          resolve({ success: true });
        });

        rzp.on("payment.error", (error: any) => {
          console.error("Payment error:", error);
          const msg = error?.error?.description || error?.error?.reason || "Payment failed. Please try again.";
          toast.error(msg);
          setIsProcessing(false);
          reject(new Error(msg));
        });

      } catch (error) {
        console.error("executePayment error:", error);
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
      console.error("Payment initiation failed:", err);
      toast.error(err instanceof Error ? err.message : "Payment failed");
      setIsProcessing(false);
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
    setShowPaymentDetailsModal: () => {},
    showCardTypeMismatchModal: false,
    setShowCardTypeMismatchModal: () => {},
    mismatchCardType: "",
    setMismatchCardType: () => {},
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
    console.warn("Card eligibility check failed, proceeding with payment:", err instanceof Error ? err.message : err);
    return { eligible: true, error: null, cardDetails: null };
  }
};

export default usePaymentHandler;
