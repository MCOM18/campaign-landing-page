"use client";

import React, { useState, useEffect, useRef } from "react";
import { useGetCountries } from "@/features/auth/hooks/useOtpLogin";
import { Country } from "@/features/auth/model/types";
import { trackEvent } from "@/services/analytics/events";
import { LoginIdentifierType } from "@/enums/ui.enum";

import { REGEX } from "@/lib/constants/regex";
import { appConfig } from "@/lib/config/app.config";

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
    countryCode: appConfig.DEFAULT_COUNTRY_NAME,
    phoneCode: appConfig.DEFAULT_MOBILE_NUMBER_CODE,
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

  useEffect(() => {
    if (countries.length > 0) {
      const india = countries.find(c => c.countryCode === appConfig.DEFAULT_COUNTRY_NAME);
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
    const isEmailInput = trimmed.includes(REGEX.AT_SYMBOL) || REGEX.ALPHABET_REGEX.test(trimmed);

    // Validation check before submission
    const isValidEmail = isEmailInput && REGEX.EMAIL.test(trimmed);
    const isValidPhone = !isEmailInput && trimmed.replace(REGEX.NON_DIGIT, "").length > 5;
    if (!isValidEmail && !isValidPhone) return;

    let fullIdentifier = trimmed;
    if (!isEmailInput && !trimmed.startsWith("+")) {
      const cleanPhone = trimmed.replace(REGEX.NON_DIGIT, "");
      fullIdentifier = `${selectedCountry.phoneCode}${cleanPhone}`;
    }

    trackEvent("login_started", {
      method: isEmailInput ? LoginIdentifierType.EMAIL : LoginIdentifierType.PHONE,
      value: fullIdentifier
    });

    if (isEmailInput) {
      onSubmit(trimmed);
    } else {
      // If it's a phone number
      if (trimmed.startsWith("+")) {
        onSubmit(trimmed);
      } else {
        // Strip non-digits and append selected country code
        const cleanPhone = trimmed.replace(REGEX.NON_DIGIT, "");
        onSubmit(`${selectedCountry.phoneCode}${cleanPhone}`);
      }
    }
  };


  const isEmail = inputValue.includes(REGEX.AT_SYMBOL) || REGEX.ALPHABET_REGEX.test(inputValue);
  const showCountryPicker = !isEmail && inputValue.trim().length > 0;

  // Validation: Email format validation, and phone number validation after 5 digits
  const cleanValue = inputValue.trim();
  const isValidEmail = isEmail && REGEX.EMAIL.test(cleanValue);
  const isValidPhone = !isEmail && cleanValue.replace(REGEX.NON_DIGIT, "").length > 5;
  const isActive = isValidEmail || isValidPhone;

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
        {confirmButtonLabel}
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
        By proceeding with the "Subscribe Now" process, we might send a one-time verification code to the Phone number/Email linked to your account. Standard message and data rates may apply.</p>
    </form>
  );
};
