"use client";

import React, { useState } from "react";

interface FreeTrialFormProps {
  onSubmit: (contactInfo: string) => void;
}

export const FreeTrialForm: React.FC<FreeTrialFormProps> = ({ onSubmit }) => {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSubmit(inputValue.trim());
    }
  };

  const isActive = inputValue.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="fade-in responsive-form-container" style={{ width: "100%" }}>
      {/* Input Field */}
      <div className="form-input-container">
        <input
          type="text"
          className="form-input"
          placeholder="Enter your Number/Email ID"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          aria-label="Phone number or Email ID"
        />
      </div>

      {/* Action Button */}
      <button
        type="submit"
        disabled={!isActive}
        className={`btn-primary ${isActive ? "active" : "inactive"} btn-start-trial`}
        style={{
          marginBottom: "1.2rem",
          outline: "none",
        }}
      >
        Start Free Trial
      </button>

      {/* Helper text under button */}
      <p
        style={{
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: "12px",
          fontWeight: "600",
          lineHeight: "18px",
          textAlign: "inherit",
          marginBottom: "3rem",
          width: "100%",
        }}
      >
        Free for 7 days, then ₹499/year. Cancel anytime.
      </p>

      {/* Long disclaimer */}
      <p
        style={{
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: "12px",
          lineHeight: "18px",
          textAlign: "inherit",
          fontWeight: "400",
          width: "100%",
        }}
      >
        No charges during the trial. Payment will be charged to your account after the trial ends unless cancelled at least 24 hours before renewal. Subscription renews automatically.
      </p>
    </form>
  );
};
