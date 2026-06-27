"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Lottie from "lottie-react";
import "./payment.css";
import successJson from "../../assets/animations/CONFETTI.json";
import TVODPaymentSuccess from "../../components/TVODPaymentSuccess";

function formatDateToDDMMYYYY(dateString: string) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-GB");
}

function PaymentSuccess() {
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const eventFiredRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("payment_success_state");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSuccessData(parsed);
          setShowConfetti(true);
        } catch (e) {
          console.error("Failed to parse payment success state:", e);
        }
      }
    }
  }, []);

  const {
    matchedType,
    matchedRecord,
    verificationData,
    planModel,
  } = successData || {};

  useEffect(() => {
    if (isMounted && (!successData || !matchedType || !matchedRecord)) {
      console.warn("PaymentSuccess: missing data — redirecting to homepage");
      const timer = setTimeout(() => router.push("/"), 2000);
      return () => clearTimeout(timer);
    }
  }, [successData, matchedType, matchedRecord, isMounted, router]);

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-gray-400">Loading success details...</p>
      </div>
    );
  }

  if (matchedType === "TVOD") {
    return (
      <TVODPaymentSuccess
        matchedRecord={matchedRecord}
        planModel={planModel}
        verificationData={verificationData}
        onStartWatching={() => router.push("/")}
        onGoHome={() => router.push("/")}
      />
    );
  }

  if (!matchedRecord) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-gray-400">Redirecting...</p>
      </div>
    );
  }

  const planName =
    matchedRecord.oProductTranslation?.sName ||
    matchedRecord.sSubProductLabel ||
    "Premium Plan";

  const groupName =
    matchedRecord.oGroupTranslation?.sName ||
    planModel?.groupInfo?.sName ||
    "JOJO Gold";

  const features = matchedRecord.aFeatures || planModel?.aFeatures || [];

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4 mt-60 relative overflow-hidden">
      {showConfetti && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
          <Lottie animationData={successJson} loop={false} style={{ width: "100%", height: "100%" }} />
        </div>
      )}

      <div className="svod-box z-20 relative">
        <h1 className="cong-head">Congratulations!</h1>
        <h2 className="cong-head2">You're successfully upgraded to</h2>

        <div className="gold-box">
          <div className="flex justify-center">
            <img src="/assets/images/Logo/jojo-gold-black.svg" alt="Jojo Gold" style={{ height: "46px", width: "auto" }} />
          </div>
          <div className="flex justify-between mt-5">
            <p className="paym-card-text">
              You've unlocked {planName} of {groupName}
            </p>
          </div>
        </div>

        <div className="py-5">
          <h3 className="member-till">
            MEMBER TILL — {formatDateToDDMMYYYY(matchedRecord.dEndDate)}
          </h3>
        </div>

        <div className="flex justify-center">
          <img src="/assets/images/Logo/goldfeture.svg" alt="Features" />
        </div>

        <div className="flex justify-content-between gap-1 mt-5 fr-det">
          {features.map((feature: any, index: number) => (
            <div
              key={feature.sFeatureId || index}
              className="feature-item flex items-center gap-3"
            >
              <img
                src={feature.sFeatureImageUrl || feature.sIcon}
                alt={feature.sFeatureName || feature.sTitle}
                className="w-10 h-10 object-contain filter-brightness"
              />
              <span className="fet-txt text-white">
                {feature.sFeatureName || feature.sTitle}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/")}
            className="px-8 py-3 btn btn-primary text-white rounded-lg font-semibold hover:opacity-90 transition"
            style={{
              background: "#f26e21",
              borderRadius: "8px",
            }}
          >
            Start Watching
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccess;
