"use client";

import React, { useEffect, useState, useRef } from "react";
import { FiMonitor, FiVideoOff, FiAward, FiClock } from "react-icons/fi";
import Lottie from "lottie-react";
import thumbnailsJson from "../../public/assets/json/THUMBNAILS SCROLL ANIMATION.json";
import confettiJson from "../../public/assets/json/confetti.json";
import { JojoLogo } from "./Icons";
import Footer from "@/components/Footer";

interface SuccessScreenProps {
  onReset: () => void;
  isTrial?: boolean;
  isCouponApplied?: boolean;
  planTitle?: string;
  discountLabel?: string;
  offerName?: string;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({
  onReset,
  isTrial = true,
  isCouponApplied: propIsCouponApplied,
  planTitle: propPlanTitle,
  discountLabel: propDiscountLabel,
  offerName: propOfferName,
}) => {
  const [couponData, setCouponData] = useState({
    isCouponApplied: false,
    planTitle: "1 Month",
    discountLabel: "20% OFF",
    offerName: "Navratri",
  });

  const lottieRef = useRef<any>(null);

  useEffect(() => {
    try {
      const selectedPlanRaw = localStorage.getItem("selectedPlan");
      const sCouponCode = localStorage.getItem("sCouponCode");

      let isApplied = propIsCouponApplied ?? !!sCouponCode;
      let title = propPlanTitle || "1 Month";
      let discount = propDiscountLabel || "";
      let offer = propOfferName || sCouponCode || "";

      if (selectedPlanRaw) {
        const plan = JSON.parse(selectedPlanRaw);
        title = plan.sSubProductLabel || plan.sProductName || title;
        discount = plan.sDiscount || discount;
      }

      setCouponData({
        isCouponApplied: isApplied,
        planTitle: title,
        discountLabel: discount,
        offerName: offer,
      });
    } catch (e) {
      // ignore
    }
  }, [propIsCouponApplied, propPlanTitle, propDiscountLabel, propOfferName]);

  const { isCouponApplied, planTitle, discountLabel, offerName } = couponData;

  return (
    <div
      className="fade-in custom-scrollbar"
      style={{
        width: "100%",
        maxWidth: "480px",
        height: "100vh",
        margin: "0 auto",
        background: "radial-gradient(circle at top, #B87A14 0%, #3B2404 45%, #050300 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        overflowY: "auto",
        boxShadow: "0 0 40px rgba(0,0,0,0.8)",
      }}
    >
      {/* Confetti Animation */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 50 }}>
        <Lottie
          animationData={confettiJson}
          loop={false}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Top Lottie Animation */}
      <div style={{ width: "100%", height: "210px", overflow: "hidden", flexShrink: 0, position: "relative", margin: 0, padding: 0 }}>
        <Lottie
          lottieRef={lottieRef}
          animationData={thumbnailsJson}
          loop={true}
          onDOMLoaded={() => lottieRef.current?.setSpeed(0.15)}
          style={{ width: "100%", height: "100%", display: "block", opacity: 0.7 }}
          rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
        />

      </div>

      <div style={{ width: "100%", padding: "0 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Top Logo */}
        <div style={{ marginBottom: "28px", display: "flex", justifyContent: "center", alignItems: "center", marginTop: "20px", position: "relative", zIndex: 2 }}>
          <JojoLogo />
        </div>

        {/* Title */}
        <p
          style={{
            backgroundImage: "linear-gradient(4.9542deg, rgb(250, 175, 63) 21.627%, rgb(255, 214, 145) 49.519%, rgb(250, 175, 63) 81.684%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontSize: "22px",
            fontWeight: "700",
            lineHeight: "30px",
            margin: "0 0 12px 0",
            textAlign: "center",
            width: "100%",
            fontFamily: "'Poppins', sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
        >
          🎉 Congratulations! 🎉
        </p>

        <p style={{
          color: "#FAAF3F",
          fontSize: "17px",
          fontWeight: "500",
          margin: "0 0 32px 0",
          textAlign: "center"
        }}>
          Your subscription is now active!
        </p>

        {/* Unlocked Message */}
        <p style={{
          color: "#E2E2E2",
          fontSize: "15px",
          fontWeight: "400",
          textAlign: "center",
          margin: "0 0 36px 0",
          lineHeight: "1.6",
          maxWidth: "320px"
        }}>
          {isCouponApplied ? (
            <>You've unlocked {planTitle} of JOJO Gold with your <br />{discountLabel} {offerName} coupon.</>
          ) : (
            <>{isTrial ? "You've successfully activated your 7-day JOJO Gold Free Trial. Enjoy!" : "You've successfully subscribed to JOJO Gold Premium. Enjoy!"}</>
          )}
        </p>

        {/* Golden Features Divider */}
        <div style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          marginBottom: "20px"
        }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(250, 175, 63, 0.4)" }} />
          <span style={{ color: "#FAAF3F", fontSize: "12px", fontWeight: "600", padding: "0 12px", letterSpacing: "1px" }}>
            GOLDEN FEATURES
          </span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(250, 175, 63, 0.4)" }} />
        </div>

        {/* Features Card */}
        <div style={{
          width: "100%",
          background: "linear-gradient(180deg, rgba(45, 30, 12, 0.8) 0%, rgba(23, 16, 5, 0.8) 100%)",
          border: "1px solid rgba(250, 175, 63, 0.15)",
          borderRadius: "16px",
          padding: "24px 12px",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "40px"
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, textAlign: "center", gap: "10px" }}>
            <FiVideoOff size={24} color="#FAAF3F" />
            <span style={{ color: "#FAAF3F", fontSize: "10px", fontWeight: "500", lineHeight: "1.3" }}>No In Video<br />Ads</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, textAlign: "center", gap: "10px" }}>
            <FiMonitor size={24} color="#FAAF3F" />
            <span style={{ color: "#FAAF3F", fontSize: "10px", fontWeight: "500", lineHeight: "1.3" }}>Watch on upto<br />4 Devices</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, textAlign: "center", gap: "10px" }}>
            <FiAward size={24} color="#FAAF3F" />
            <span style={{ color: "#FAAF3F", fontSize: "10px", fontWeight: "500", lineHeight: "1.3" }}>Exclusive<br />Content</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, textAlign: "center", gap: "10px" }}>
            <FiClock size={24} color="#FAAF3F" />
            <span style={{ color: "#FAAF3F", fontSize: "10px", fontWeight: "500", lineHeight: "1.3" }}>Early Bird<br />Access</span>
          </div>
        </div>

        {/* Explore Now Button */}
        <button
          onClick={onReset}
          style={{
            width: "100%",
            maxWidth: "240px",
            height: "48px",
            borderRadius: "100px",
            border: "none",
            background: "linear-gradient(90deg, #FFCD78 0%, #F5A623 50%, #FFCD78 100%)",
            color: "#191919",
            fontSize: "16px",
            fontWeight: "700",
            fontFamily: "'Poppins', sans-serif",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            outline: "none",
            boxShadow: "0 8px 24px rgba(250, 175, 63, 0.25)",
            transition: "transform 0.1s ease",
            marginBottom: "40px"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          Explore Now
        </button>

        {/* Footer */}
        <div style={{ width: "100%", paddingBottom: "40px" }}>
          <Footer />
        </div>
      </div>
    </div>
  );
};
