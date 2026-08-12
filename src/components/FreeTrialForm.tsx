"use client";

import React, { useState, useEffect, useRef } from "react";
import { useGetCountries } from "@/features/auth/hooks/useOtpLogin";
import { Country } from "@/features/auth/model/types";
import { trackEvent } from "@/services/analytics/events";
import { LoginIdentifierType } from "@/enums/ui.enum";

import { REGEX } from "@/lib/constants/regex";
import { appConfig } from "@/lib/config/app.config";
import { CoverflowCarousel } from "@/components/CoverflowCarousel";

/** Renders footer note text, turning "Terms of Use" and "Privacy Statement" into gold clickable links. */
const renderFooterWithLinks = (text: string) => {
  if (!text) return null;

  const termsText = "Terms of Use";
  const privacyText = "Privacy Statement";

  const linkStyle: React.CSSProperties = {
    color: "#FAAF3F",
    textDecoration: "underline",
    fontWeight: "600",
  };

  if (text.includes(termsText) && text.includes(privacyText)) {
    const partsByTerms = text.split(termsText);
    const beforeTerms = partsByTerms[0];
    const afterTerms = partsByTerms.slice(1).join(termsText);
    const partsByPrivacy = afterTerms.split(privacyText);
    const betweenTermsAndPrivacy = partsByPrivacy[0];
    const afterPrivacy = partsByPrivacy.slice(1).join(privacyText);
    return (
      <>
        {beforeTerms}
        <a href="https://jojoapp.in/terms-conditions" target="_blank" rel="noopener noreferrer" style={linkStyle}>
          {termsText}
        </a>
        {betweenTermsAndPrivacy}
        <a href="https://jojoapp.in/privacy-policy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
          {privacyText}
        </a>
        {afterPrivacy}
      </>
    );
  }

  if (text.includes(termsText)) {
    const parts = text.split(termsText);
    return (
      <>
        {parts[0]}
        <a href="https://jojoapp.in/terms-conditions" target="_blank" rel="noopener noreferrer" style={linkStyle}>
          {termsText}
        </a>
        {parts.slice(1).join(termsText)}
      </>
    );
  }

  if (text.includes(privacyText)) {
    const parts = text.split(privacyText);
    return (
      <>
        {parts[0]}
        <a href="https://jojoapp.in/privacy-policy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
          {privacyText}
        </a>
        {parts.slice(1).join(privacyText)}
      </>
    );
  }

  return <>{text}</>;
};

interface FreeTrialFormProps {
  onSubmit: (contactInfo: string) => void;
  confirmButtonLabel?: string;
  disclaimerText?: string;
  footerNote?: string;
  showCarousel?: boolean;
}

export const FreeTrialForm: React.FC<FreeTrialFormProps> = ({
  onSubmit,
  confirmButtonLabel,
  disclaimerText,
  footerNote,
  showCarousel = false,
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
        className={`btn-primary btn-start-trial`}
        style={{
          marginBottom: "1.2rem",
          outline: "none",
          width: "fit-content",
          minWidth: "100px",
          padding: "12px 32px",
          whiteSpace: "nowrap",
          display: "block",
          marginLeft: "auto",
          marginRight: "auto",
          borderRadius: "9999px",
          textAlign: "center",
          ...(isActive
            ? {
              background: "rgba(242, 110, 33, 1)",
              backgroundImage: "none",
              color: "#ffffff",
              border: "none",
              boxShadow: "none",
            }
            : {
              background: "rgba(255, 255, 255, 0.15)",
              backgroundImage: "none",
              border: "none",
              boxShadow: "none",
              cursor: "not-allowed",
              color: "rgba(255, 255, 255, 0.4)",
            }),
        }}
      >
        {confirmButtonLabel}
      </button>

      {/* Helper text under button */}
      {disclaimerText && (
        <p
          style={{
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "14px",
            fontWeight: "600",
            lineHeight: "18px",
            textAlign: "left",
            marginBottom: "3rem",
            width: "100%",
          }}
        >
          {disclaimerText}
        </p>
      )}

      {/* Long disclaimer — highlights "Terms of Use" and "Privacy Statement" as gold links */}
      <p
        style={{
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: "14px",
          lineHeight: "22px",
          textAlign: "left",
          fontWeight: "400",
          width: "100%",
        }}
      >
        {footerNote
          ? renderFooterWithLinks(footerNote)
          : 'By proceeding with the "Subscribe Now" process, we might send a one-time verification code to the Phone number/Email linked to your account. Standard message and data rates may apply.'}
      </p>

      {/* 3D Coverflow Card Carousel below footerNote */}
      {showCarousel && <CoverflowCarousel />}
    </form>
  );
};
