"use client";

import React, { useState, useEffect, useRef } from "react";

interface OtpVerificationProps {
  contactInfo: string;
  onSubmit: (otp: string) => void;
  onBack: () => void;
  onResend?: () => void;
  disclaimerText?: string;
  isMobileLayout?: boolean;
}

export const OtpVerification: React.FC<OtpVerificationProps> = ({
  contactInfo,
  onSubmit,
  onBack,
  onResend,
  disclaimerText,
  isMobileLayout,
}) => {
  const [otpValue, setOtpValue] = useState("");
  const [timer, setTimer] = useState(15);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [receivedOtpData, setReceivedOtpData] = useState<string>("");

  // Start Resend Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Focus first input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const hasSubmittedRef = useRef(false);

  const triggerSubmit = async (code: string) => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    try {
      await onSubmit(code);
    } finally {
      hasSubmittedRef.current = false;
    }
  };

  const submitRef = useRef(triggerSubmit);
  useEffect(() => {
    submitRef.current = triggerSubmit;
  }, [onSubmit]);

  // WebOTP API for automatic SMS OTP fetching
  useEffect(() => {
    // Only run WebOTP on the instance that matches the active layout screen size
    const isMobileScreen = typeof window !== "undefined" && window.innerWidth < 768;
    const shouldRunWebOTP = isMobileLayout === undefined ? true : (isMobileLayout ? isMobileScreen : !isMobileScreen);

    if (shouldRunWebOTP && "OTPCredential" in window) {
      const ac = new AbortController();

      const timeoutId = setTimeout(() => {
        navigator.credentials
          .get({
            otp: { transport: ["sms"] },
            signal: ac.signal,
          } as any)
          .then((otp: any) => {
            const displayData = otp ? `code: "${otp.code}", type: "${otp.type}"` : "null/empty";
            setReceivedOtpData(displayData);
            if (otp && otp.code) {
              const codeString = String(otp.code).trim().substring(0, 4);
              setOtpValue(codeString);
              if (codeString.length >= 4) {
                submitRef.current(codeString);
              }
            }
          })
          .catch((err) => {
            if (err.name === "AbortError") {
              return;
            }
          });
      }, 250);

      return () => {
        clearTimeout(timeoutId);
        ac.abort();
      };
    }
  }, [isMobileLayout]);

  // Debug event listeners to trace native browser/autofill events
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const logEvent = (e: Event) => {
      let val = "";
      if (e.target instanceof HTMLInputElement) {
        val = e.target.value;
      }
    };

    const events = ["input", "change", "paste", "keydown", "keyup", "focus", "blur"];
    events.forEach(name => el.addEventListener(name, logEvent));

    return () => {
      events.forEach(name => el.removeEventListener(name, logEvent));
    };
  }, [otpValue]);

  // Handle auto-focus and auto-submit
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    hasSubmittedRef.current = false;
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    setOtpValue(val);

    if (val.length === 4) {
      triggerSubmit(val);
    }
  };

  const handleResend = () => {
    hasSubmittedRef.current = false;
    setTimer(15);
    setOtpValue("");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    if (onResend) {
      onResend();
    }
  };

  const isComplete = otpValue.length === 4;

  return (
    <div className="fade-in responsive-form-container" style={{ width: "100%" }}>
      {/* Contact Info and Edit Link */}
      <div className="responsive-text-align" style={{ marginBottom: "1.5rem", width: "100%" }}>
        {receivedOtpData && (
          <div style={{ color: "#39ff14", backgroundColor: "rgba(57, 255, 20, 0.15)", border: "1px solid #39ff14", padding: "8px", borderRadius: "8px", fontSize: "14px", fontWeight: "bold", marginBottom: "0.8rem", wordBreak: "break-all" }}>
            [RECEIVED WEBOTP DATA]: {receivedOtpData}
          </div>
        )}
        <p style={{ color: "#ffffff", fontSize: "16px", marginBottom: "0.5rem" }}>
          Enter the OTP sent on <strong style={{ color: "#ffffff" }}>{contactInfo}</strong>
        </p>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            fontWeight: "600",
            cursor: "pointer",
            padding: 0,
            outline: "none",
            textDecoration: "underline",
          }}
        >
          <span className="gold-text-gradient">
            {contactInfo.includes("@") ? "Change Email ID" : "Change Phone Number"}
          </span>
        </button>
      </div>

      {/* OTP Boxes Wrapper */}
      <div
        className="otp-boxes-container"
        style={{ position: "relative", cursor: "text" }}
        onClick={() => inputRef.current?.focus()}
      >
        <input
          ref={inputRef}
          type="tel"
          name="otp"
          id="otp-input"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={otpValue}
          onChange={handleChange}
          autoComplete="one-time-code"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 1,
            color: "transparent",
            caretColor: "transparent",
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            cursor: "text",
            fontSize: "24px",
            zIndex: -1,
            pointerEvents: "none",
          }}
        />

        {/* Visible styled boxes */}
        {[0, 1, 2, 3].map((idx) => {
          const char = otpValue[idx] || "";
          const isFocused = otpValue.length === idx;
          return (
            <div
              key={idx}
              className={`otp-input-wrapper ${char ? "filled" : ""} ${isFocused ? "focused" : ""}`}
              style={{
                zIndex: 1,
                border: isFocused ? "1.5px solid #FAAF3F" : "none",
              }}
            >
              <span style={{ fontSize: "16px", color: "#ffffff", fontWeight: "400" }}>{char}</span>
            </div>
          );
        })}
      </div>

      {/* Timer / Resend OTP Link */}
      <div className="responsive-text-align" style={{ marginBottom: "2.5rem", fontSize: "14px", width: "100%" }}>
        {timer > 0 ? (
          <span style={{ color: "rgba(255,255,255,0.7)" }}>
            Resend OTP in <strong className="gold-text-gradient" style={{ fontWeight: "700" }}>00:{timer < 10 ? `0${timer}` : timer}</strong>
          </span>
        ) : (
          <button
            onClick={handleResend}
            style={{
              background: "none",
              border: "none",
              fontWeight: "600",
              cursor: "pointer",
              padding: 0,
              outline: "none",
            }}
          >
            <span className="gold-text-gradient">Resend OTP</span>
          </button>
        )}
      </div>

      {/* Next Button */}
      <button
        type="button"
        disabled={!isComplete}
        onClick={() => triggerSubmit(otpValue)}
        className={`btn-primary ${isComplete ? "active" : "inactive"} btn-otp-next`}
        style={{
          marginBottom: "1.2rem",
          outline: "none",
        }}
      >
        Next
      </button>

      {/* Subscription Pricing line */}
      <p
        style={{
          color: "#ffffff",
          fontSize: "14px",
          textAlign: "inherit",
          fontWeight: "400",
          width: "100%",
        }}
      >
        {disclaimerText || "Free for 7 days, then ₹499/year. Cancel anytime."}
      </p>

      {/* Temporary Debug Console */}
      <div style={{
        marginTop: "20px",
        padding: "10px",
        background: "rgba(0,0,0,0.8)",
        border: "1px solid #ff4d4d",
        borderRadius: "8px",
        fontSize: "11px",
        color: "#39ff14",
        fontFamily: "monospace",
        maxHeight: "150px",
        overflowY: "auto",
        textAlign: "left",
        width: "100%",
        boxSizing: "border-box"
      }}>
        <div style={{ fontWeight: "bold", color: "#ff4d4d", borderBottom: "1px solid #ff4d4d", marginBottom: "5px", paddingBottom: "2px" }}>WebOTP Debug Console:</div>
        {debugLog.length === 0 ? (
          <div>No logs recorded yet.</div>
        ) : (
          debugLog.map((log, i) => <div key={i} style={{ marginBottom: "2px" }}>{log}</div>)
        )}
      </div>
    </div>
  );
};
