"use client";

import React, { useState } from "react";
import {
  JojoLogo,
  NoAdsIcon,
  DevicesIcon,
  ExclusiveIcon,
  HdIcon,
} from "@/components/Icons";
import { FreeTrialForm } from "@/components/FreeTrialForm";
import { OtpVerification } from "@/components/OtpVerification";
import { SuccessScreen } from "@/components/SuccessScreen";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { useAuthStore } from "@/store/useAuthStore";
import { initiateOtpFlow, completeOtpVerification } from "@/features/auth/services/auth.service";

export default function Home() {
  const { isAppReady } = useBootstrap();
  const [step, setStep] = useState<"input" | "otp" | "success">("input");
  const [contactInfo, setContactInfo] = useState("");
  const [parsedPhone, setParsedPhone] = useState("");
  const [parsedPhoneCode, setParsedPhoneCode] = useState("");
  const [isExists, setIsExists] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAuth = useAuthStore((state) => state.setAuth);

  const handleInputSubmit = async (contact: string) => {
    setError(null);
    setIsVerifying(true);

    const isEmail = contact.includes("@");
    let phone = contact.trim();
    let phoneCode = "";

    if (!isEmail) {
      if (phone.startsWith("+")) {
        const match = phone.match(/^\+(\d{1,4})(.*)$/);
        if (match) {
          phoneCode = `+${match[1]}`;
          phone = match[2].replace(/\D/g, "");
        }
      } else {
        const clean = phone.replace(/\D/g, "");
        phoneCode = "+91"; // Default to India country code
        phone = clean;
      }
    }

    try {
      const result = await initiateOtpFlow(phone, phoneCode);
      setContactInfo(contact);
      setParsedPhone(phone);
      setParsedPhoneCode(phoneCode);
      setIsExists(result.isExists);
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please check your credentials and try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpSubmit = async (otpCode: string) => {
    setError(null);
    setIsVerifying(true);

    try {
      const response = await completeOtpVerification(
        parsedPhone,
        parsedPhoneCode,
        otpCode,
        !isExists
      );

      const user = {
        id: response.user_id,
        phone: response.phone || "",
        email: response.email || "",
        isGuest: false,
        createdAt: new Date().toISOString(),
      };
      
      setAuth(user, response.session_id, "");
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Invalid OTP code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBack = () => {
    setError(null);
    setStep("input");
  };

  const handleReset = () => {
    setError(null);
    setStep("input");
    setContactInfo("");
    setParsedPhone("");
    setParsedPhoneCode("");
    setIsExists(false);
  };

  const handleResendOtp = async () => {
    setError(null);
    setIsVerifying(true);

    try {
      await initiateOtpFlow(parsedPhone, parsedPhoneCode);
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isAppReady) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#0c0b0a",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            border: "3px solid rgba(255, 214, 69, 0.1)",
            borderTop: "3px solid var(--gold-primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            marginBottom: "1rem",
          }}
        />
        <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>Loading settings...</p>
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
    <main className="app-container">
      {/* 1. MOBILE VIEW (Visible on screens < 768px) */}
      <div className="mobile-only" style={{ width: "100%" }}>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Movie Posters Banner */}
          <div className="posters-banner-container">
            <img
              src="/assets/posters_mobile.png"
              alt="Movie Posters"
              className="posters-banner-image"
            />
            <div className="posters-banner-mask" />
          </div>

          {/* Top Header Logo */}
          <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "center", width: "100%" }}>
            <JojoLogo />
          </header>

          {/* Header Title Section & Tab Badge */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2.5rem" }}>
            <h1
              className="gold-text-gradient"
              style={{
                fontSize: "44px",
                fontWeight: "900",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                textAlign: "center",
                margin: 0,
                lineHeight: "48px",
              }}
            >
              Free TRIAL
            </h1>
            <div style={{ width: "231px", display: "flex", flexDirection: "column", alignItems: "center", marginTop: "6px" }}>
              <div style={{ width: "100%", height: "1px", backgroundColor: "rgba(255, 225, 174, 0.15)" }} />
              <div
                className="gold-bg-gradient"
                style={{
                  color: "#050505",
                  fontSize: "16px",
                  fontWeight: "700",
                  width: "112px",
                  height: "34px",
                  borderRadius: "0 0 16px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                For 7 days
              </div>
            </div>
          </div>

          {/* Benefits Grid */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              marginBottom: "2.5rem",
              padding: "0 1.5rem",
              gap: "8px",
            }}
          >
            {/* Benefit 1 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "25%" }}>
              <NoAdsIcon uid="mobile" />
              <span
                className="gold-text-gradient"
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  textAlign: "center",
                  marginTop: "8px",
                  lineHeight: "1.3",
                }}
              >
                No In Video<br />Ads
              </span>
            </div>

            {/* Benefit 2 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "25%" }}>
              <DevicesIcon />
              <span
                className="gold-text-gradient"
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  textAlign: "center",
                  marginTop: "8px",
                  lineHeight: "1.3",
                }}
              >
                Watch on upto<br />4 Devices
              </span>
            </div>

            {/* Benefit 3 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "25%" }}>
              <ExclusiveIcon />
              <span
                className="gold-text-gradient"
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  textAlign: "center",
                  marginTop: "8px",
                  lineHeight: "1.3",
                }}
              >
                Exclusive<br />Content
              </span>
            </div>

            {/* Benefit 4 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "25%" }}>
              <HdIcon uid="mobile" />
              <span
                className="gold-text-gradient"
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  textAlign: "center",
                  marginTop: "8px",
                  lineHeight: "1.3",
                }}
              >
                Full HD 1080p<br />Content
              </span>
            </div>
          </div>

          {/* Form Step Wrapper */}
          <div style={{ width: "100%", padding: "0 1.5rem" }}>
            {error && (
              <div style={{ color: "#ff4a4a", fontSize: "14px", marginBottom: "1.5rem", width: "100%", textAlign: "center", fontWeight: "500" }}>
                {error}
              </div>
            )}
            {isVerifying ? (
              <div
                className="fade-in"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "200px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    border: "3px solid rgba(255, 214, 69, 0.1)",
                    borderTop: "3px solid var(--gold-primary)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    marginBottom: "1rem",
                  }}
                />
                <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>Verifying OTP...</p>
                <style jsx global>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            ) : step === "input" ? (
              <FreeTrialForm onSubmit={handleInputSubmit} />
            ) : (
              <OtpVerification
                contactInfo={contactInfo}
                onSubmit={handleOtpSubmit}
                onBack={handleBack}
                onResend={handleResendOtp}
              />
            )}
          </div>
        </div>
      </div>

      {/* 2. DESKTOP VIEW (Visible on screens >= 768px) */}
      <div className="desktop-only" style={{ width: "100%" }}>
        {/* Movie Posters Banner */}
        <div className="posters-banner-container">
          <img
            src="/assets/posters_desktop.png"
            alt="Movie Posters"
            className="posters-banner-image"
          />
          <div className="posters-banner-mask" />
        </div>

        {/* Top Header Logo */}
        <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "center", width: "100%" }}>
          <JojoLogo />
        </header>

        {/* Header Title Section & Tab Badge */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "3.5rem" }}>
          <h1
            className="gold-text-gradient"
            style={{
              fontSize: "44px",
              fontWeight: "900",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              textAlign: "center",
              margin: 0,
              lineHeight: "48px",
            }}
          >
            Free TRIAL
          </h1>
          <div style={{ width: "231px", display: "flex", flexDirection: "column", alignItems: "center", marginTop: "6px" }}>
            <div style={{ width: "100%", height: "1px", backgroundColor: "rgba(255, 225, 174, 0.15)" }} />
            <div
              className="gold-bg-gradient"
              style={{
                color: "#050505",
                fontSize: "16px",
                fontWeight: "700",
                width: "112px",
                height: "34px",
                borderRadius: "0 0 16px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              For 7 days
            </div>
          </div>
        </div>

        {/* Web Split Columns Layout */}
        <div className="web-split-layout">
          {/* Left Column (50%): Form actions, Pricing, Disclaimer */}
          <div className="web-layout-left">
            <div style={{ width: "100%" }}>
              {error && (
                <div style={{ color: "#ff4a4a", fontSize: "14px", marginBottom: "1.5rem", width: "100%", textAlign: "left", fontWeight: "500" }}>
                  {error}
                </div>
              )}
              {isVerifying ? (
                <div
                  className="fade-in"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "150px",
                    width: "100%"
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      border: "3px solid rgba(255, 214, 69, 0.1)",
                      borderTop: "3px solid var(--gold-primary)",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                      marginBottom: "1rem",
                    }}
                  />
                  <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>Verifying OTP...</p>
                </div>
              ) : step === "input" ? (
                <FreeTrialForm onSubmit={handleInputSubmit} />
              ) : (
                <OtpVerification
                  contactInfo={contactInfo}
                  onSubmit={handleOtpSubmit}
                  onBack={handleBack}
                  onResend={handleResendOtp}
                />
              )}
            </div>
          </div>

          {/* Right Column (50%): Gold Features Separator & 2x2 Feature Grid */}
          <div className="web-layout-right">
            <div className="web-features-header">
              <div className="web-features-header-line" />
              <span className="web-features-header-text gold-text-gradient">GOLD FEATURES</span>
              <div className="web-features-header-line" />
            </div>

            <div className="web-features-grid">
              {/* Card 1 */}
              <div className="web-feature-card">
                <NoAdsIcon uid="desktop" />
                <span className="gold-text-gradient" style={{ fontSize: "12px", fontWeight: "600" }}>No In Video Ads</span>
              </div>

              {/* Card 2 */}
              <div className="web-feature-card">
                <DevicesIcon />
                <span className="gold-text-gradient" style={{ fontSize: "12px", fontWeight: "600" }}>Watch on upto 4 Devices</span>
              </div>

              {/* Card 3 */}
              <div className="web-feature-card">
                <ExclusiveIcon />
                <span className="gold-text-gradient" style={{ fontSize: "12px", fontWeight: "600" }}>Exclusive Content</span>
              </div>

              {/* Card 4 */}
              <div className="web-feature-card">
                <HdIcon uid="desktop" />
                <span className="gold-text-gradient" style={{ fontSize: "12px", fontWeight: "600" }}>Full HD 1080 Content</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer links at the bottom */}
        <footer className="web-footer-container">
          <div className="web-footer-grid">
            <div className="web-footer-column">
              <span className="web-footer-link">FAQs</span>
              <span className="web-footer-link">Terms & Conditions</span>
              <span className="web-footer-link">Privacy Policy</span>
              <div style={{ marginTop: "1rem" }}>
                <img
                  src="/assets/plain_logo.svg"
                  alt="JOJO Logo"
                  style={{ width: "93px", height: "30px", display: "block" }}
                />
              </div>
            </div>

            <div className="web-footer-column">
              <span className="web-footer-link">Advertise with us</span>
              <span className="web-footer-link">Contact Us</span>
              <span className="web-footer-link">Help & Support</span>
              <span className="web-footer-link">Assets</span>
              <span className="web-footer-link">Careers</span>
            </div>

            <div className="web-footer-column" style={{ alignItems: "flex-end", textAlign: "right" }}>
              <span style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Follow us for more updates</span>
              <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem" }}>
                <img src="/assets/fb.svg" alt="Facebook" style={{ width: "32px", height: "32px", cursor: "pointer" }} />
                <img src="/assets/twitter.svg" alt="Twitter" style={{ width: "32px", height: "32px", cursor: "pointer" }} />
                <img src="/assets/instagram.svg" alt="Instagram" style={{ width: "32px", height: "32px", cursor: "pointer" }} />
                <img src="/assets/youtube.svg" alt="YouTube" style={{ width: "32px", height: "32px", cursor: "pointer" }} />
              </div>

              <span style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Download the JOJO app</span>
              <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem" }}>
                {/* Google Play Button */}
                <div
                  style={{
                    backgroundColor: "#e2e2e2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "6px 10px",
                    borderRadius: "4px",
                    height: "37px",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
                    <img src="/assets/google_play_logo.png" alt="Google Play Icon" style={{ width: "21px", height: "22px" }} />
                    <img src="/assets/google_play_text.svg" alt="Google Play Store" style={{ width: "76.7px", height: "23.5px" }} />
                  </div>
                </div>
                {/* App Store Button */}
                <div
                  style={{
                    backgroundColor: "#e2e2e2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "6px 10px",
                    borderRadius: "4px",
                    height: "37px",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
                    <img src="/assets/apple_logo.svg" alt="Apple Icon" style={{ width: "19.3px", height: "22.6px" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px", justifyContent: "center" }}>
                      <img src="/assets/apple_text_line1.svg" alt="Download on the" style={{ width: "72.6px", height: "6.4px" }} />
                      <img src="/assets/apple_text_line2.svg" alt="App Store" style={{ width: "78.8px", height: "15.6px" }} />
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "1rem", justifyContent: "flex-end" }}>
                <img src="/assets/copyright.svg" alt="Copyright Icon" style={{ width: "14px", height: "14px" }} />
                <span style={{ fontSize: "12px", color: "#e2e2e2" }}>
                  2025 All the Copyrights Reserved to JOJO Limited
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Unified Success State Overlay Modal - outside main so fixed covers full viewport */}
      </main>
      {step === "success" && (
        <div className="success-overlay">
          <SuccessScreen onReset={handleReset} />
        </div>
      )}
    </>
  );
}
