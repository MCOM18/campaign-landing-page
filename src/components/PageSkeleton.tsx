import React from "react";
import Footer from "./Footer";

interface PageSkeletonProps {
  showFooter?: boolean;
}

export default function PageSkeleton({ showFooter = true }: PageSkeletonProps) {
  return (
    <main
      className="app-container"
      style={{
        background: "#0c0b0a",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0",
      }}
    >
      {/* 1. MOBILE VIEW (Visible on screens < 768px) */}
      <div className="mobile-only" style={{ width: "100%" }}>
        <div
          className="login-flow-screen fade-in"
          style={{
            margin: "0 auto",
            width: "100%",
            maxWidth: "480px",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "32px 24px 24px",
          }}
        >
          {/* Logo Skeleton */}
          <div className="skeleton-pulse" style={{ width: "120px", height: "36px", borderRadius: "8px", marginBottom: "20px", marginTop: "16px" }} />
          
          {/* Banner Skeleton */}
          <div className="skeleton-pulse" style={{ width: "100%", height: "220px", borderRadius: "20px", marginBottom: "32px" }} />
          
          {/* Form/Card Skeletons */}
          <div className="skeleton-pulse" style={{ width: "100%", height: "180px", borderRadius: "16px", marginBottom: "16px" }} />
          <div className="skeleton-pulse" style={{ width: "100%", height: "60px", borderRadius: "30px", marginBottom: "16px" }} />
          
          {/* Optional Footer inside mobile overlay */}
          {showFooter && (
            <div style={{ width: "100%", marginTop: "auto" }}>
              <Footer />
            </div>
          )}
        </div>
      </div>

      {/* 2. DESKTOP VIEW (Visible on screens >= 768px) */}
      <div className="desktop-only fade-in" style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* Top Centered Logo */}
        <header style={{ padding: "40px 0 20px 0", display: "flex", justifyContent: "center", width: "100%" }}>
          <div className="skeleton-pulse" style={{ width: "140px", height: "40px", borderRadius: "8px" }} />
        </header>

        <div className="web-split-layout" style={{ alignItems: "center", flex: 1 }}>
          {/* Left Side: Campaign Banner */}
          <div className="web-layout-left">
            <div className="skeleton-pulse" style={{ width: "100%", height: "400px", borderRadius: "20px", boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)" }} />
            <div className="skeleton-pulse" style={{ width: "80%", height: "24px", borderRadius: "6px", marginTop: "24px" }} />
            <div className="skeleton-pulse" style={{ width: "60%", height: "24px", borderRadius: "6px", marginTop: "12px" }} />
          </div>

          {/* Right Side: Form */}
          <div className="web-layout-right">
            <div
              className="responsive-form-container"
              style={{
                margin: "0 auto",
                background: "var(--desktop-form-bg)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "24px",
                padding: "40px",
                boxShadow: "0 24px 48px rgba(0, 0, 0, 0.4)",
                width: "100%",
                maxWidth: "480px",
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}
            >
              <div className="skeleton-pulse" style={{ width: "70%", height: "30px", borderRadius: "8px", alignSelf: "center", marginBottom: "16px" }} />
              <div className="skeleton-pulse" style={{ width: "100%", height: "160px", borderRadius: "12px" }} />
              <div className="skeleton-pulse" style={{ width: "100%", height: "56px", borderRadius: "30px", marginTop: "16px" }} />
            </div>
          </div>
        </div>
        
        {/* Footer for desktop view */}
        {showFooter && (
          <div style={{ width: "100%", marginTop: "auto" }}>
            <Footer />
          </div>
        )}
      </div>
    </main>
  );
}
