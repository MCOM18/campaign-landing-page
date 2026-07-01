"use client";

import React from "react";

interface GoldRestrictionModalProps {
  subscription: {
    plan_name?: string;
    end_date?: string;
  } | null;
  onClose: () => void;
  title?: string;
  description?: string;
}

function formatDate(dateString?: string) {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("en-GB");
  } catch {
    return dateString;
  }
}

export const GoldRestrictionModal: React.FC<GoldRestrictionModalProps> = ({
  subscription,
  onClose,
  title,
  description,
}) => {
  const planName = subscription?.plan_name || "JOJO Gold Premium";
  const endDate = subscription?.end_date ? formatDate(subscription.end_date) : "";

  const defaultTitle = "You are already a Gold Member!";
  const defaultDesc = `An active subscription (${planName}) is already running on your account. ${endDate && `It is valid till ${endDate}.`} You cannot purchase another trial at this moment.`;

  const finalTitle = title || defaultTitle;
  const finalDesc = description || defaultDesc;

  return (
    <div
      className="fade-in"
      style={{
        width: "355px",
        borderRadius: "16px",
        border: "2px solid rgba(250, 175, 63, 0.14)",
        backgroundImage: `url("data:image/svg+xml;utf8,<svg viewBox='0 0 355 224' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='0.56'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(0.046588 22.4 -38.909 0.074831 177.03 0.0000097384)'><stop stop-color='rgba(250,175,63,1)' offset='0'/><stop stop-color='rgba(188,132,48,0.75)' offset='0.25'/><stop stop-color='rgba(127,90,34,0.5)' offset='0.5'/><stop stop-color='rgba(66,47,19,0.25)' offset='0.75'/><stop stop-color='rgba(5,5,5,0)' offset='1'/></radialGradient></defs></svg>"), linear-gradient(90deg, rgb(5, 5, 5) 0%, rgb(5, 5, 5) 100%)`,
        backgroundSize: "100% 100%, 100% 100%",
        backgroundPosition: "center",
        boxSizing: "border-box",
        padding: "28px 32px 30px 32px",
        display: "flex",
        flexDirection: "column",
        gap: "30px",
        alignItems: "center",
      }}
    >


      {/* Title & Description */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          alignItems: "center",
          width: "100%",
        }}
      >
        <p
          style={{
            backgroundImage: "linear-gradient(4.9542deg, rgb(250, 175, 63) 21.627%, rgb(255, 214, 145) 49.519%, rgb(250, 175, 63) 81.684%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontSize: "20px",
            fontWeight: "600",
            lineHeight: "26px",
            margin: 0,
            textAlign: "center",
            width: "100%",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {finalTitle}
        </p>

        <p
          style={{
            fontSize: "14px",
            fontWeight: "400",
            lineHeight: "20px",
            color: "#cccccc",
            margin: 0,
            textAlign: "center",
            width: "100%",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {finalDesc}
        </p>
      </div>

      {/* Button: Explore Gold */}
      <div style={{ width: "100%" }}>
        <button
          onClick={() => {
            window.open("https://jojoapp.in", "_blank", "noopener,noreferrer");
            onClose();
          }}
          style={{
            width: "100%",
            height: "44px",
            borderRadius: "100px",
            border: "none",
            backgroundImage: "linear-gradient(9.09198deg, rgb(250, 175, 63) 21.627%, rgb(255, 214, 145) 49.519%, rgb(250, 175, 63) 81.684%)",
            color: "#191919",
            fontSize: "16px",
            fontWeight: "600",
            lineHeight: "24px",
            fontFamily: "'Poppins', sans-serif",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            outline: "none",
            transition: "opacity 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Explore Gold
        </button>
      </div>
    </div>
  );
};

export default GoldRestrictionModal;
