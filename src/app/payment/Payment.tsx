"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { FiChevronUp, FiChevronDown, FiChevronLeft, FiEye, FiEyeOff } from "react-icons/fi";
import SubscriptionPlanCard from "./SubscriptionPlanCard";
import { usePaymentHandler, getPricingData, checkCardRecurringEligibility } from "../../hooks/usePaymentHandler";
import { PAYMENT_METHOD } from "@/enums/enums";
import PhoneCollectModal from "./PhoneCollectModal";
import { GoldRestrictionModal } from "@/components/GoldRestrictionModal";
import { SuccessScreen } from "@/components/SuccessScreen";
import { FailureScreen } from "@/components/FailureScreen";
import "./payment.css";

function PaymentPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [countryCode, setCountryCode] = useState("IN");

  const {
    preparePayment,
    executePayment,
    isProcessing,
    isPreparing,
    showProcessingOverlay,
    pollingAttempt,
    overlayError,
  } = usePaymentHandler();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionId = localStorage.getItem("session_id");
      const userId = localStorage.getItem("user_id");
      const stored = sessionStorage.getItem("selectedPlan");

      if (!sessionId || !userId || !stored) {
        toast.error("Please log in first.");
        router.push("/");
        return;
      }

      setIsAuthorized(true);

      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSelectedPlan(parsed);
        } catch (e) {
          console.error("Failed to parse selected plan:", e);
        }
      }
      const geo = localStorage.getItem("geoLocationData");
      if (geo) {
        try {
          const parsed = JSON.parse(geo);
          setCountryCode(parsed?.data?.country_code || "IN");
        } catch { }
      }
    }
    setIsMounted(true);
  }, [router]);

  const isOverseasUser = countryCode !== "IN";

  const [upiId, setUpiId] = useState("");
  const [card, setCard] = useState({
    number: "",
    month: "",
    year: "",
    cvv: "",
    name: ""
  });
  const [showCvv, setShowCvv] = useState(false);
  const [upiError, setUpiError] = useState("");
  const [expiryDisplay, setExpiryDisplay] = useState("");
  const [cardErrors, setCardErrors] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: ""
  });
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [activeMethod, setActiveMethod] = useState<string | null>(PAYMENT_METHOD.UPI);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [showGoldPopup, setShowGoldPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showFailedPopup, setShowFailedPopup] = useState(false);
  const [failedErrorMsg, setFailedErrorMsg] = useState<string | null>(null);

  // Overseas users can't use UPI — default to card
  useEffect(() => {
    if (isOverseasUser) {
      setActiveMethod(PAYMENT_METHOD.CARD);
      setPaymentMethod("card");
    }
  }, [isOverseasUser]);

  const toggleMethod = (method: string) => {
    setActiveMethod(activeMethod === method ? null : method);
    setPaymentMethod(method);
  };

  const pricingData = getPricingData(selectedPlan);

  useEffect(() => {
    if (isMounted && !selectedPlan) {
      toast.error("Please select a plan first");
      router.push("/");
      return;
    }
    if (isMounted && selectedPlan && !pricingData) {
      toast.error("Invalid plan pricing. Please try again.");
      router.push("/");
      return;
    }
  }, [selectedPlan, isMounted, pricingData, router]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessing) {
        e.preventDefault();
        e.returnValue = "Payment is being processed. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isProcessing]);

  const luhnCheck = (num: string) => {
    const digits = num.replace(/\s/g, '').split('').reverse();
    let sum = 0;
    digits.forEach((d, i) => {
      let n = parseInt(d);
      if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
    });
    return sum % 10 === 0;
  };

  const validateCard = () => {
    const errors = { number: "", expiry: "", cvv: "", name: "" };
    let valid = true;

    const rawNumber = card.number.replace(/\s/g, '');
    if (!rawNumber) {
      errors.number = "Card number is required";
      valid = false;
    } else if (rawNumber.length < 15 || rawNumber.length > 16) {
      errors.number = "Card number must be 15–16 digits";
      valid = false;
    } else if (!luhnCheck(rawNumber)) {
      errors.number = "Invalid card number";
      valid = false;
    }

    if (!card.month || !card.year) {
      errors.expiry = "Expiry date is required";
      valid = false;
    } else {
      const month = parseInt(card.month);
      const year = parseInt("20" + card.year);
      const now = new Date();
      const expiry = new Date(year, month - 1, 1);
      if (month < 1 || month > 12) {
        errors.expiry = "Invalid month (01–12)";
        valid = false;
      } else if (expiry < new Date(now.getFullYear(), now.getMonth(), 1)) {
        errors.expiry = "Card has expired";
        valid = false;
      }
    }

    if (!card.cvv) {
      errors.cvv = "CVV is required";
      valid = false;
    } else if (card.cvv.length < 3) {
      errors.cvv = "CVV must be 3–4 digits";
      valid = false;
    }

    if (!card.name.trim()) {
      errors.name = "Cardholder name is required";
      valid = false;
    } else if (card.name.trim().length < 2) {
      errors.name = "Enter a valid name";
      valid = false;
    }

    setCardErrors(errors);
    return valid;
  };

  const handlePaymentClick = async () => {
    if (paymentMethod === "upi") {
      if (!upiId) {
        setUpiError("UPI ID is required");
        return;
      }
      if (!upiId.includes("@")) {
        setUpiError("Enter valid UPI ID (example: name@bank)");
        return;
      }
      setUpiError("");
    }
    if (paymentMethod === "card") {
      if (!validateCard()) return;

      if (pricingData?.type === "SVOD") {
        const eligibility = await checkCardRecurringEligibility(card.number);
        if (!eligibility.eligible) {
          setCardErrors((prev) => ({ ...prev, number: eligibility.error || "Card not eligible" }));
          return;
        }
      }
    }

    const storedPhone = localStorage.getItem("user_phone");
    const userData = (() => { try { return JSON.parse(localStorage.getItem("userData") || "{}"); } catch { return {}; } })();
    const phoneFromUserData = userData?.phone || userData?.sPhone || userData?.phone_number || userData?.mobile || "";
    if (!storedPhone && !phoneFromUserData) {
      setShowPhoneModal(true);
      return;
    }

    const data = await preparePayment(selectedPlan, paymentMethod);
    if (!data) return;

    if ((data as any).isAlreadyActive) {
      setShowGoldPopup(true);
      return;
    }

    if (!data.oOrderDetails) return;

    if (!pricingData) return; // narrowed: pricingData is PricingData from here

    const paymentDetails = {
      upiId: paymentMethod === "upi" ? upiId : null,
      card: paymentMethod === "card" ? card : null,
    };

    executePayment(selectedPlan, paymentMethod, paymentDetails, pricingData, data)
      .then((res: any) => {
        if (res?.success) {
          setShowSuccessPopup(true);
        } else {
          setFailedErrorMsg(res?.error || "Payment verification failed. Please try again.");
          setShowFailedPopup(true);
        }
      })
      .catch((err: any) => {
        console.error("Payment failed:", err);
        setFailedErrorMsg(err?.message || "Payment failed. Please try again.");
        setShowFailedPopup(true);
      });
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    const formatted = value.replace(/(\d{4})/g, '$1 ').trim();
    setCard({ ...card, number: formatted });
    if (cardErrors.number) setCardErrors({ ...cardErrors, number: "" });
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    let digits = raw.replace(/\D/g, '');
    if (digits.length > 4) digits = digits.slice(0, 4);
    let formatted = digits;
    if (digits.length >= 2) {
      formatted = digits.slice(0, 2) + '/' + digits.slice(2);
    }
    setExpiryDisplay(formatted);
    const split = digits.length >= 2
      ? [digits.slice(0, 2), digits.slice(2)]
      : [digits, ""];
    setCard({
      ...card,
      month: split[0] || "",
      year: split[1] || ""
    });
    if (cardErrors.expiry) setCardErrors({ ...cardErrors, expiry: "" });
  };

  const landscapeUrl =
    selectedPlan?.aMediaUrls?.[0] ||
    selectedPlan?.LandScapUrl ||
    selectedPlan?.oSubscriptionGroup?.aMediaUrls?.[0] ||
    null;

  if (!isMounted || !isAuthorized || !selectedPlan || !pricingData) {
    return (
      <div className="payment_wrapper">
        <p style={{ color: "rgba(255,255,255,0.5)" }}>Loading plan details...</p>
      </div>
    );
  }

  return (
    <>
      {showPhoneModal && (
        <PhoneCollectModal
          onComplete={() => {
            setShowPhoneModal(false);
            handlePaymentClick();
          }}
        />
      )}

      {showGoldPopup && (
        <div className="success-overlay">
          <GoldRestrictionModal
            subscription={null}
            onClose={() => {
              setShowGoldPopup(false);
              router.push("/");
            }}
          />
        </div>
      )}

      {showSuccessPopup && (
        <div className="success-overlay">
          <SuccessScreen
            onReset={() => {
              setShowSuccessPopup(false);
              router.push("/");
            }}
          />
        </div>
      )}

      {showFailedPopup && (
        <div className="success-overlay">
          <FailureScreen
            errorMsg={failedErrorMsg}
            onClose={() => {
              setShowFailedPopup(false);
            }}
          />
        </div>
      )}

      {/* Processing overlay */}
      {showProcessingOverlay && (
        <div className="pay-overlay">
          <div className="pay-overlay-card">
            <div className="pay-spinner" />
            <p className="pay-overlay-title">Processing Payment</p>
            <p className="pay-overlay-subtitle">
              {pollingAttempt > 0
                ? `Verifying payment... (${pollingAttempt}/10)`
                : "Please wait..."}
            </p>
            {overlayError && (
              <div className="pay-overlay-error">{overlayError}</div>
            )}
          </div>
        </div>
      )}

      {/* Main payment page */}
      <div className="payment_wrapper">
        <div className="payment-wrapper-b">

          {/* Back header */}
          <div
            className="pay-head"
            onClick={() => {
              localStorage.removeItem("payment_init_data");
              localStorage.removeItem("payment_sToken");
              localStorage.removeItem("payment_sProviderToken");
              router.push("/");
            }}
          >
            <FiChevronLeft size={26} />
            <span>Payment</span>
          </div>

          {/* Selected plan card */}
          <SubscriptionPlanCard
            plan={selectedPlan}
            isActive
            landscapeUrl={landscapeUrl}
          />

          {/* Payment methods */}
          <div style={{ marginTop: "24px" }}>
            <div className="payment-methods">

              {/* UPI — hidden for overseas users */}
              {!isOverseasUser && (
                <div className={`payment-section${activeMethod === PAYMENT_METHOD.UPI ? " active" : ""}`}>
                  <div
                    className="payment-header"
                    onClick={() => toggleMethod(PAYMENT_METHOD.UPI)}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <img src="/assets/images/upi-icon.svg" alt="UPI" style={{ width: "36px", height: "36px" }} />
                      <span>UPI</span>
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>
                      {activeMethod === PAYMENT_METHOD.UPI
                        ? <FiChevronUp size={20} />
                        : <FiChevronDown size={20} />}
                    </span>
                  </div>

                  {activeMethod === PAYMENT_METHOD.UPI && (
                    <div className="payment-content">
                      <input
                        type="text"
                        placeholder="e.g., username@okhdfcbank"
                        className={`payment-input${upiError ? " input-error" : ""}`}
                        value={upiId}
                        onChange={(e) => {
                          setUpiId(e.target.value);
                          if (upiError) setUpiError("");
                        }}
                      />
                      {upiError && <span className="card-error-text">{upiError}</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Credit / Debit Card */}
              <div className={`payment-section${activeMethod === PAYMENT_METHOD.CARD ? " active" : ""}`}>
                <div
                  className="payment-header"
                  onClick={() => toggleMethod(PAYMENT_METHOD.CARD)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img src="/assets/images/credit-card-icon.svg" alt="Card" style={{ width: "36px", height: "36px" }} />
                    <span>Credit / Debit Card</span>
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>
                    {activeMethod === PAYMENT_METHOD.CARD
                      ? <FiChevronUp size={20} />
                      : <FiChevronDown size={20} />}
                  </span>
                </div>

                {activeMethod === PAYMENT_METHOD.CARD && (
                  <div className="payment-content">
                    {/* Card number */}
                    <div>
                      <input
                        type="text"
                        placeholder="Card Number"
                        className={`payment-input${cardErrors.number ? " input-error" : ""}`}
                        value={card.number}
                        onChange={handleCardNumberChange}
                      />
                      {cardErrors.number && <span className="card-error-text">{cardErrors.number}</span>}
                    </div>

                    {/* Expiry + CVV row */}
                    <div className="pay-expiry-cvv-row">
                      <div>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          className={`payment-input${cardErrors.expiry ? " input-error" : ""}`}
                          value={expiryDisplay}
                          onChange={handleExpiryChange}
                        />
                        {cardErrors.expiry && <span className="card-error-text">{cardErrors.expiry}</span>}
                      </div>
                      <div>
                        <div className="cvv-input-wrapper">
                          <input
                            type={showCvv ? "text" : "password"}
                            placeholder="CVV"
                            maxLength={4}
                            className={`payment-input${cardErrors.cvv ? " input-error" : ""}`}
                            value={card.cvv}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setCard({ ...card, cvv: val });
                              if (cardErrors.cvv) setCardErrors({ ...cardErrors, cvv: "" });
                            }}
                          />
                          <button
                            type="button"
                            className="cvv-eye-btn"
                            onClick={() => setShowCvv((v) => !v)}
                            tabIndex={-1}
                          >
                            {showCvv ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                          </button>
                        </div>
                        {cardErrors.cvv && <span className="card-error-text">{cardErrors.cvv}</span>}
                      </div>
                    </div>

                    {/* Cardholder name */}
                    <div>
                      <input
                        type="text"
                        placeholder="Cardholder Name"
                        className={`payment-input${cardErrors.name ? " input-error" : ""}`}
                        value={card.name}
                        onChange={(e) => {
                          setCard({ ...card, name: e.target.value });
                          if (cardErrors.name) setCardErrors({ ...cardErrors, name: "" });
                        }}
                      />
                      {cardErrors.name && <span className="card-error-text">{cardErrors.name}</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pay button */}
            <button
              onClick={handlePaymentClick}
              disabled={isProcessing || isPreparing}
              className="prcoess-btn"
              style={{ marginTop: "28px" }}
            >
              {isPreparing ? (
                "Preparing..."
              ) : isProcessing ? (
                "Processing..."
              ) : (
                `Proceed to pay ${pricingData?.currencySymbol || "₹"}${pricingData?.price ?? ""}`
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default PaymentPage;
