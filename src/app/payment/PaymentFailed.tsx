"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnalyticEvents } from "../../analytics/AnalyticEvents";

import { logger } from "@/lib/logger/logger";

function PaymentFailed() {
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [errorData, setErrorData] = useState<any>(null);
  const eventFiredRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("payment_failed_state");
      if (stored) {
        try {
          setErrorData(JSON.parse(stored));
        } catch (e) {
          logger.error("Failed to parse payment failed state:", e);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (isMounted && errorData && !eventFiredRef.current) {
      eventFiredRef.current = true;
      const userId = localStorage.getItem("user_id");

      AnalyticEvents.svodPurchaseFailure(
        errorData.planModel || {},
        { user_id: userId },
        "RAZORPAY",
        errorData.sToken || "",
        null,
        errorData.error || "Payment failed"
      );
    }
  }, [errorData, isMounted]);

  useEffect(() => {
    if (isMounted && !errorData) {
      router.push("/");
    }
  }, [isMounted, errorData, router]);

  if (!isMounted || !errorData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-gray-400">Loading error details...</p>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-black flex flex-col justify-center items-center p-6 text-center">
      <div className="bg-white shadow-md rounded-xl p-8 max-w-md w-full">
        <div className="flex justify-center text-red-600 text-6xl mb-4">
          <span role="img" aria-label="failure">
            ❌
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          Payment Failed
        </h1>
        <p className="text-gray-600 mb-4">
          {errorData?.error || "Unfortunately, your payment could not be processed. Please try again."}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-full px-6 py-3 btn btn-primary text-white rounded-lg font-semibold hover:opacity-90 transition"
            style={{
              background: "#f26e21",
              borderRadius: "8px",
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    </section>
  );
}

export default PaymentFailed;
