"use client";

import React, { useState, useEffect, useRef } from "react";

interface OtpVerificationProps {
  contactInfo: string;
  onSubmit: (otp: string) => void;
  onBack: () => void;
  onResend?: () => void;
}

export const OtpVerification: React.FC<OtpVerificationProps> = ({
  contactInfo,
  onSubmit,
  onBack,
  onResend,
}) => {
  const [otp, setOtp] = useState<string[]>(["", "", "", ""]);
  const [timer, setTimer] = useState(15);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Start Resend Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Handle auto-focus and auto-submit
  const handleChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    // Keep only the last character entered
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // If typing a digit and not at the end, focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check for auto-submit
    const combinedOtp = newOtp.join("");
    if (combinedOtp.length === 4) {
      onSubmit(combinedOtp);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // Focus previous input if current is empty
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current value
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{4}$/.test(pastedData)) {
      const digits = pastedData.split("");
      setOtp(digits);
      onSubmit(pastedData);
    }
  };

  const handleResend = () => {
    setTimer(15);
    setOtp(["", "", "", ""]);
    // Focus first input
    inputRefs.current[0]?.focus();
    if (onResend) {
      onResend();
    }
  };

  const isComplete = otp.every((val) => val.length === 1);

  return (
    <div className="fade-in responsive-form-container" style={{ width: "100%" }}>
      {/* Contact Info and Edit Link */}
      <div className="responsive-text-align" style={{ marginBottom: "1.5rem", width: "100%" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px", marginBottom: "0.5rem" }}>
          Enter the OTP sent on <strong style={{ color: "#ffffff" }}>{contactInfo}</strong>
        </p>

      </div>

      {/* OTP Boxes Wrapper */}
      <div className="otp-boxes-container">
        {otp.map((digit, idx) => (
          <input
            key={idx}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e.target.value, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onPaste={idx === 0 ? handlePaste : undefined}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            className={`otp-input ${digit ? "filled" : ""}`}
          />
        ))}
      </div>

      {/* Timer / Resend OTP Link */}
      <div style={{ marginBottom: "2.5rem", fontSize: "14px", textAlign: "center", width: "100%" }}>
        {timer > 0 ? (
          <span style={{ color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
            Resend OTP in <strong className="gold-text-gradient" style={{ fontWeight: "700" }}>00:{timer < 10 ? `0${timer}` : timer}</strong>
          </span>
        ) : (
          <button
            onClick={handleResend}
            style={{
              background: "none",
              border: "none",
              color: "var(--gold-primary)",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Resend OTP
          </button>
        )}
      </div>

      {/* Next Button */}
      <button
        type="button"
        disabled={!isComplete}
        onClick={() => onSubmit(otp.join(""))}
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
          color: "var(--text-secondary)",
          fontSize: "14px",
          textAlign: "inherit",
          fontWeight: "400",
          width: "100%",
        }}
      >
        Free for 7 days, then ₹499/year. Cancel anytime.
      </p>
    </div>
  );
};
