"use client";

import React, { useState, useEffect, useRef } from "react";
import { useGetCountries } from "@/features/auth/hooks/useOtpLogin";
import { Country } from "@/features/auth/model/types";

interface FreeTrialFormProps {
  onSubmit: (contactInfo: string) => void;
  confirmButtonLabel?: string;
  disclaimerText?: string;
  footerNote?: string;
}

export const FreeTrialForm: React.FC<FreeTrialFormProps> = ({
  onSubmit,
  confirmButtonLabel,
  disclaimerText,
  footerNote,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { data: countries = [] } = useGetCountries();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Default to India
  const [selectedCountry, setSelectedCountry] = useState<Country>({
    countryCode: "IN",
    phoneCode: "+91",
    countryName: "India",
    flag: "🇮🇳"
  });

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Update default selected country based on fetched data if available
  useEffect(() => {
    if (countries.length > 0) {
      const india = countries.find(c => c.countryCode === "IN");
      if (india) {
        setSelectedCountry(india);
      } else {
        setSelectedCountry(countries[0]);
      }
    }
  }, [countries]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // Detect if input is email
    const isEmailInput = trimmed.includes("@") || /[a-zA-Z]/.test(trimmed);
    if (isEmailInput) {
      onSubmit(trimmed);
    } else {
      // If it's a phone number
      if (trimmed.startsWith("+")) {
        onSubmit(trimmed);
      } else {
        // Strip non-digits and append selected country code
        const cleanPhone = trimmed.replace(/\D/g, "");
        onSubmit(`${selectedCountry.phoneCode}${cleanPhone}`);
      }
    }
  };

  const isEmail = inputValue.includes("@") || /[a-zA-Z]/.test(inputValue);
  const showCountryPicker = !isEmail;
  const isActive = inputValue.trim().length > 0;

  const filteredCountries = countries.filter(c =>
    c.countryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phoneCode.includes(searchQuery) ||
    c.countryCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} className="fade-in responsive-form-container" style={{ width: "100%" }}>
      {/* Input Field with Country Selector */}
      <div className="form-input-container flex-container">
        {showCountryPicker && (
          <div className="country-selector-wrapper" ref={dropdownRef}>
            <button
              type="button"
              className="country-selector-btn"
              onClick={() => setIsOpen(!isOpen)}
            >
              <span className="country-flag">{selectedCountry.flag}</span>
              <span className="country-code">{selectedCountry.phoneCode}</span>
              <span className="dropdown-arrow">▾</span>
            </button>

            {isOpen && (
              <div className="country-dropdown-menu fade-in">
                <input
                  type="text"
                  className="country-search-input"
                  placeholder="Search country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()} // Prevent click propagation
                />
                <div className="country-list-scroll">
                  {filteredCountries.map((c) => (
                    <button
                      key={`${c.countryCode}-${c.phoneCode}`}
                      type="button"
                      className={`country-option-item ${c.countryCode === selectedCountry.countryCode ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedCountry(c);
                        setIsOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <span className="country-flag">{c.flag}</span>
                      <span className="country-option-name">{c.countryName}</span>
                      <span className="country-option-code">{c.phoneCode}</span>
                    </button>
                  ))}
                  {filteredCountries.length === 0 && (
                    <div className="no-countries-found">No countries found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <input
          type="text"
          ref={inputRef}
          className="form-input"
          placeholder={showCountryPicker ? "Enter your Phone Number" : "Enter your Number/Email ID"}
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
          width: "50%",
          display: "block",
          marginLeft: "auto",
          marginRight: "auto",
          padding: "10px 10px 10px 10px",
        }}
      >
        {confirmButtonLabel || "Start Free Trial"}
      </button>

      {/* Helper text under button */}
      <p
        style={{
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: "14px",
          fontWeight: "600",
          lineHeight: "18px",
          textAlign: "inherit",
          marginBottom: "3rem",
          width: "100%",
        }}
      >
        {disclaimerText}
      </p>

      {/* Long disclaimer */}
      <p
        style={{
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: "14px",
          lineHeight: "22px",
          textAlign: "inherit",
          fontWeight: "400",
          width: "100%",
        }}
      >
        {footerNote || "No charges during the trial. Payment will be charged to your account after the trial ends unless cancelled at least 24 hours before renewal. Subscription renews automatically."}
      </p>
    </form>
  );
};
