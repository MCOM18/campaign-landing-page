import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Lottie from 'lottie-react';
import successJson from '../assets/animations/CONFETTI.json';

interface TVODPaymentSuccessProps {
  matchedRecord: any;
  verificationData: any;
  planModel: any;
  onStartWatching?: () => void;
  onGoHome?: () => void;
}

const TVODPaymentSuccess: React.FC<TVODPaymentSuccessProps> = ({ 
  matchedRecord,
  verificationData, 
  planModel, 
  onStartWatching, 
  onGoHome 
}) => {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(false);

  const tvodData = matchedRecord || verificationData?.oneTime?.[0] || {};
  const assetIds = tvodData?.aAssetIds || [];
  const orderId = tvodData?.sOrderId;

  const assetName =
    tvodData?.oProductTranslation?.sTitle ||
    tvodData?.oProductTranslation?.sName ||
    planModel?.oProductTranslation?.asset_title ||
    planModel?.oProductTranslation?.sTitle ||
    planModel?.sName ||
    "Premium Content";

  const rentalDays =
    tvodData?.nRentalValidityDays ||
    tvodData?.nInitialValidityDays ||
    planModel?.nRentalValidityDays ||
    planModel?.nInitialValidityDays ||
    0;

  const amount = tvodData?.nAmount || planModel?.pricing?.nPrice || 0;
  const currency = planModel?.pricing?.sCurrencySymbol || "₹";

  useEffect(() => {
    setShowConfetti(true);
  }, []);

  const handleStartWatching = () => {
    if (onStartWatching) {
      onStartWatching();
    } else if (assetIds.length > 0) {
      router.push(`/asset/${assetIds[0]}`);
    } else {
      router.push('/');
    }
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      router.push('/');
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
      padding: "20px",
      position: "relative",
      overflow: "hidden",
      width: "100%",
    }}>
      {showConfetti && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 10,
        }}>
          <Lottie animationData={successJson} loop={false} />
        </div>
      )}

      <div style={{
        background: "rgba(25, 25, 25, 0.95)",
        border: "1px solid rgba(242, 110, 33, 0.3)",
        borderRadius: "16px",
        padding: "40px",
        textAlign: "center",
        maxWidth: "500px",
        width: "100%",
        position: "relative",
        zIndex: 20,
        backdropFilter: "blur(10px)",
      }}>
        <div style={{
          color: "#4ade80",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "center",
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </svg>
        </div>

        <h1 style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "#ffffff",
          margin: "0 0 12px 0",
        }}>Purchase Successful!</h1>
        
        <h2 style={{
          fontSize: "20px",
          fontWeight: 600,
          color: "#f26e21",
          margin: "0 0 32px 0",
          lineHeight: 1.3,
        }}>{assetName}</h2>

        <div style={{
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}>
            <span style={{ color: "#cccccc", fontSize: "14px" }}>Amount Paid:</span>
            <span style={{ color: "#ffffff", fontWeight: 600, fontSize: "14px" }}>{currency}{amount}</span>
          </div>
          
          {rentalDays > 0 && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}>
              <span style={{ color: "#cccccc", fontSize: "14px" }}>Valid for:</span>
              <span style={{ color: "#ffffff", fontWeight: 600, fontSize: "14px" }}>{rentalDays} days</span>
            </div>
          )}
          
          {orderId && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span style={{ color: "#cccccc", fontSize: "14px" }}>Order ID:</span>
              <span style={{ color: "#ffffff", fontWeight: 600, fontSize: "14px" }}>{orderId}</span>
            </div>
          )}
        </div>

        <div style={{ marginBottom: "32px" }}>
          <p style={{ color: "#cccccc", margin: "0 0 8px 0", lineHeight: 1.5 }}>
            You now have access to watch this content.
          </p>
          {rentalDays > 0 && (
            <p style={{ color: "#4ade80", fontSize: "14px", margin: 0 }}>
              Watch as many times as you want within {rentalDays} days.
            </p>
          )}
        </div>

        <div style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
        }}>
          <button 
            style={{
              padding: "14px 24px",
              borderRadius: "8px",
              border: "1px solid #f26e21",
              fontWeight: 600,
              fontSize: "16px",
              cursor: "pointer",
              background: "transparent",
              color: "#f26e21",
              width: "100%",
            }}
            onClick={handleGoHome}
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default TVODPaymentSuccess;
