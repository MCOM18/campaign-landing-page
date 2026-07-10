"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { FiChevronUp, FiChevronDown, FiChevronLeft, FiEye, FiEyeOff } from "react-icons/fi";
import SubscriptionPlanCard from "./SubscriptionPlanCard";
import { usePaymentHandler, getPricingData, checkCardRecurringEligibility, loadRazorpayScript } from "../../hooks/usePaymentHandler";
import { getUserGeoLocation } from "../../utils/userUtil";
import { PAYMENT_METHOD } from "@/enums/enums";
import PhoneCollectModal from "./PhoneCollectModal";
import { GoldRestrictionModal } from "@/components/GoldRestrictionModal";
import { SuccessScreen } from "@/components/SuccessScreen";
import { FailureScreen } from "@/components/FailureScreen";
import { analyticsService } from "@/shared/analytics";
import { trackEvent } from "@/services/analytics/events";
import "./payment.css";
import { appConfig } from "@/lib/config/app.config";

function PaymentPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [countryCode, setCountryCode] = useState(appConfig.DEFAULT_COUNTRY_NAME);
  const [osPlatform, setOsPlatform] = useState<"android" | "ios" | "web">("web");
  const [upiApps, setUpiApps] = useState<any[]>([]);
  const [activeAppLoader, setActiveAppLoader] = useState<string | null>(null);

  const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

  const {
    preparePayment,
    executePayment,
    isProcessing,
    isPreparing,
    preparedData,
    showProcessingOverlay,
    pollingAttempt,
    overlayError,
  } = usePaymentHandler();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionId = localStorage.getItem("session_id");
      const userId = localStorage.getItem("user_id");
      const stored = localStorage.getItem("selectedPlan");

      if (!sessionId || !userId || !stored) {
        toast.error("Please log in first.");
        router.push("/");
        return;
      }

      setIsAuthorized(true);

      // Removed trackLoginCompleted from here


      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSelectedPlan(parsed);
        } catch (e) {
          // console.error("Failed to parse selected plan:", e);
        }
      }
      const geoData = getUserGeoLocation();
      if (geoData?.country_code) {
        setCountryCode(geoData.country_code);
      }

      // OS Detection for UPI Intent
      const ua = navigator.userAgent.toLowerCase();
      let platform: "android" | "ios" | "web" = "web";
      if (/android/.test(ua)) platform = "android";
      else if (/iphone|ipad|ipod/.test(ua)) platform = "ios";
      setOsPlatform(platform);

      if (platform === "ios") {
        setUpiApps(["google_pay", "phonepe", "paytm", "bhim", "cred"]);
      }
    }
    setIsMounted(true);
  }, [router, RAZORPAY_KEY]);

  const isOverseasUser = countryCode !== appConfig.DEFAULT_COUNTRY_NAME;

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

  // Query installed UPI Apps on Android
  useEffect(() => {
    if (osPlatform === "android" && RAZORPAY_KEY) {
      loadRazorpayScript().then((loaded) => {
        if (loaded && window.Razorpay) {
          const rzp = new window.Razorpay({
            key: RAZORPAY_KEY
          });
          if (rzp.getSupportedUpiIntentApps) {
            rzp.getSupportedUpiIntentApps()
              .then((apps: any) => {
                let appsArray: any[] = [];
                if (Array.isArray(apps)) appsArray = apps;
                else if (apps && typeof apps === "object") {
                  appsArray = Object.keys(apps).filter((k) => apps[k]);
                }
                setUpiApps(appsArray);
              })
              .catch((err: any) => {
                console.error("Failed to detect UPI apps:", err);
              });
          }
        }
      });
    }
  }, [osPlatform, preparedData, RAZORPAY_KEY]);

  // Clear app loaders if the user returns to the browser after an OS intent
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setActiveAppLoader(null);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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

    trackEvent("initiate_checkout", {
      amount: pricingData.price,
      plan_id: selectedPlan.iSubscriptionGroupId,
      plan_name: selectedPlan.sTitle,
    });

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
        // console.error("Payment failed:", err);
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
            if (osPlatform !== "web") {
              preparePayment(selectedPlan, "upi").catch(() => { });
            }
            // Still call handlePaymentClick in case they initiated via the main Pay button
            handlePaymentClick();
          }}
        />
      )}

      {showGoldPopup && (
        <div className="success-overlay">
          <GoldRestrictionModal
            subscription={null}
            title="You are already a Gold Member!"
            description="An active subscription (JOJO Gold Premium) is already running on your account. You cannot purchase another trial at this moment."
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
            isTrial={!!pricingData?.offerId}
            onReset={() => {
              setShowSuccessPopup(false);
              const storedRedirectUrl = localStorage.getItem("campaign_redirect_url");

              // Validate it's a real jojoapp.in URL
              const isCampaignUrl = storedRedirectUrl && (() => {
                try {
                  return new URL(storedRedirectUrl).hostname.endsWith("jojoapp.in");
                } catch { return false; }
              })();

              if (isCampaignUrl) {
                localStorage.removeItem("campaign_redirect_url");

                // Track campaign purchase success if data exists
                const campaignDataRaw = localStorage.getItem("campaign_decoded_data");
                if (campaignDataRaw) {
                  try {
                    const campaignData = JSON.parse(campaignDataRaw);
                    analyticsService.track("campaign_purchase_success", campaignData);
                    localStorage.removeItem("campaign_decoded_data");
                  } catch (e) {
                    // console.error("Failed to parse/track campaign success:", e);
                  }
                }

                // Redirect to the campaign deep-link in the same tab
                window.location.href = storedRedirectUrl!;
              } else {
                // No campaign redirect URL stored — clean up and redirect to jojoapp.in homepage in the same tab
                localStorage.removeItem("campaign_redirect_url");
                localStorage.removeItem("campaign_decoded_data");
                window.location.href = "https://jojoapp.in";
              }
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
                      {osPlatform !== "web" ? (
                        <>
                          <div className="apps-container" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                            {upiApps
                              .filter((appCode) => ["phonepe", "gpay", "google_pay", "paytm", "cred"].includes(appCode.toLowerCase()))
                              .slice(0, 4)
                              .map((appCode) => {
                                const metadata: Record<string, any> = {
                                  phonepe: { name: "PhonePe", img: "/assets/upi/phone-pe.jpg" },
                                  gpay: { name: "GPay", img: "/assets/upi/gpay.png" },
                                  google_pay: { name: "GPay", img: "/assets/upi/gpay.png" },
                                  paytm: { name: "Paytm", img: "/assets/upi/paytm.webp" },
                                  bhim: { name: "BHIM", img: "/assets/upi/bhim.png" },
                                  cred: { name: "Cred", img: "/assets/upi/cred.webp" },
                                };
                                const cleanCode = appCode.toLowerCase();
                                const meta = metadata[cleanCode] || { name: appCode, img: "/assets/upi/other_upis.png" };
                                const isThisLoading = activeAppLoader === cleanCode;

                                return (
                                  <div
                                    key={cleanCode}
                                    className={`app-card ${activeAppLoader && !isThisLoading ? "opacity-50 pointer-events-none" : ""}`}
                                    style={{ padding: "12px 6px", gap: "8px", borderRadius: "12px" }}
                                    onClick={() => {
                                      if (isPreparing || activeAppLoader) return;

                                      const storedPhone = localStorage.getItem("user_phone");
                                      const userData = (() => { try { return JSON.parse(localStorage.getItem("userData") || "{}"); } catch { return {}; } })();
                                      const phoneFromUserData = userData?.phone || userData?.sPhone || userData?.phone_number || userData?.mobile || "";
                                      if (!storedPhone && !phoneFromUserData) {
                                        setShowPhoneModal(true);
                                        return;
                                      }

                                      if (!pricingData) {
                                        toast.error("Pricing data not available");
                                        return;
                                      }

                                      setActiveAppLoader(cleanCode);
                                      preparePayment(selectedPlan, "upi")
                                        .then((data: any) => {
                                          if (!data || !data.oOrderDetails) {
                                            setActiveAppLoader(null);
                                            return;
                                          }
                                          return executePayment(selectedPlan, "upi", { upiId: null }, pricingData, data, cleanCode);
                                        })
                                        .then((res: any) => {
                                          if (!res) return; // if it was aborted earlier
                                          setActiveAppLoader(null);
                                          if (res?.success) setShowSuccessPopup(true);
                                          else {
                                            setFailedErrorMsg(res?.error || "Payment verification failed.");
                                            setShowFailedPopup(true);
                                          }
                                        })
                                        .catch((err: any) => {
                                          setActiveAppLoader(null);
                                          setFailedErrorMsg(err?.message || "Payment failed.");
                                          setShowFailedPopup(true);
                                        });
                                    }}
                                  >
                                    <div className="app-icon-wrapper" style={{ background: "transparent", border: "none", width: "40px", height: "40px", borderRadius: "12px", overflow: "hidden" }}>
                                      {isThisLoading ? (
                                        <div className="spinner-small" style={{ width: "24px", height: "24px", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                                      ) : (
                                        <img src={meta.img} alt={meta.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                      )}
                                    </div>
                                    <div className="app-name" style={{ fontSize: "0.7rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{meta.name}</div>
                                  </div>
                                );
                              })}
                            {osPlatform === "android" && upiApps.length === 0 && (
                              <div className="no-apps-message">Scanning for UPI apps...</div>
                            )}
                            {osPlatform === "android" && (
                              <div
                                className={`app-card any-app-card ${activeAppLoader && activeAppLoader !== "any" ? "opacity-50 pointer-events-none" : ""}`}
                                onClick={() => {
                                  if (isPreparing || activeAppLoader) return;

                                  const storedPhone = localStorage.getItem("user_phone");
                                  const userData = (() => { try { return JSON.parse(localStorage.getItem("userData") || "{}"); } catch { return {}; } })();
                                  const phoneFromUserData = userData?.phone || userData?.sPhone || userData?.phone_number || userData?.mobile || "";
                                  if (!storedPhone && !phoneFromUserData) {
                                    setShowPhoneModal(true);
                                    return;
                                  }

                                  if (!pricingData) {
                                    toast.error("Pricing data not available");
                                    return;
                                  }

                                  setActiveAppLoader("any");
                                  preparePayment(selectedPlan, "upi")
                                    .then((data: any) => {
                                      if (!data || !data.oOrderDetails) {
                                        setActiveAppLoader(null);
                                        return;
                                      }
                                      return executePayment(selectedPlan, "upi", { upiId: null }, pricingData, data, "any");
                                    })
                                    .then((res: any) => {
                                      if (!res) return; // if it was aborted earlier
                                      setActiveAppLoader(null);
                                      if (res?.success) setShowSuccessPopup(true);
                                      else {
                                        setFailedErrorMsg(res?.error || "Payment verification failed.");
                                        setShowFailedPopup(true);
                                      }
                                    })
                                    .catch((err: any) => {
                                      setActiveAppLoader(null);
                                      setFailedErrorMsg(err?.message || "Payment failed.");
                                      setShowFailedPopup(true);
                                    });
                                }}
                              >
                                <div className="app-icon-wrapper app-generic" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", width: "40px", height: "40px", borderRadius: "12px", overflow: "hidden" }}>
                                  {activeAppLoader === "any" ? (
                                    <div className="spinner-small" style={{ width: "24px", height: "24px", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                                  ) : (
                                    <img src="/assets/upi/other_upis.png" alt="Other Apps" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  )}
                                </div>
                                <div className="app-name" style={{ fontSize: "0.7rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>Other</div>
                              </div>
                            )}
                          </div>

                          <div style={{ textAlign: "center", margin: "24px 0 16px", color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: "600", letterSpacing: "1px" }}>
                            OR ENTER UPI ID
                          </div>

                          <div className="upi-vpa-section">
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
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
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
                "Proceed to pay"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default PaymentPage;
