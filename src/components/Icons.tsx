import React from "react";

// JOJO Gold Logo Icon (using exact Figma brand SVGs)
export const JojoLogo: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex items-center gap-[5.89px] justify-center ${className || ""}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5.89px" }}>
    {/* JOJO text & embedded play icon */}
    <img
      src="/assets/jojo_text.svg"
      alt="JOJO"
      style={{ width: "103px", height: "34px", display: "block" }}
    />
    {/* Gold Pill badge */}
    <div
      style={{
        backgroundImage: "linear-gradient(24.9503deg, rgb(250, 175, 63) 21.627%, rgb(255, 214, 145) 49.519%, rgb(250, 175, 63) 81.684%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8.5px 11px",
        borderRadius: "5px",
        height: "34px",
      }}
    >
      <img
        src="/assets/gold_badge.svg"
        alt="Gold"
        style={{ width: "49px", height: "17px", display: "block" }}
      />
    </div>
  </div>
);

// Benefit 1: No In Video Ads — inline SVG with unique gradient ID via prop
export const NoAdsIcon: React.FC<{ uid?: string }> = ({ uid = "a" }) => {
  const gid = `noads_g_${uid}`;
  return (
    <svg
      width="34"
      height="29"
      viewBox="0 0 34 29"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="14.5" x2="34" y2="14.5" gradientUnits="userSpaceOnUse">
          <stop offset="21.627%" stopColor="#faaf3f" />
          <stop offset="49.519%" stopColor="#ffd691" />
          <stop offset="81.684%" stopColor="#faaf3f" />
        </linearGradient>
      </defs>
      {/* Outer screen rounded rect */}
      <rect x="1.5" y="4" width="30" height="21" rx="2.5" stroke={`url(#${gid})`} strokeWidth="1.2" fill="none" />
      {/* Screen inner display area */}
      <rect x="4" y="6.5" width="25" height="16" rx="1" fill="none" stroke={`url(#${gid})`} strokeWidth="0.8" />
      {/* AD text */}
      <text
        x="17"
        y="16.5"
        textAnchor="middle"
        fontSize="7.2"
        fontFamily="Poppins, sans-serif"
        fontWeight="500"
        letterSpacing="0.217"
        fill={`url(#${gid})`}
      >
        AD
      </text>
      {/* Diagonal cross-out line */}
      <line
        x1="2.12"
        y1="4.93"
        x2="30.33"
        y2="24.16"
        stroke={`url(#${gid})`}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
};

// Benefit 2: Watch on upto 4 Devices
export const DevicesIcon: React.FC = () => (
  <div style={{ position: "relative", width: "33px", height: "28px" }}>
    <img
      src="/assets/benefit2_group.svg"
      alt="Watch on upto 4 Devices"
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  </div>
);

// Benefit 3: Exclusive Content
export const ExclusiveIcon: React.FC = () => (
  <div style={{ position: "relative", width: "33px", height: "28px" }}>
    <img
      src="/assets/benefit3_group.svg"
      alt="Exclusive Content"
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  </div>
);

// Benefit 4: Full HD 1080 Content — inline SVG with unique gradient ID via prop
export const HdIcon: React.FC<{ uid?: string }> = ({ uid = "a" }) => {
  const gid = `hd_g_${uid}`;
  return (
    <svg
      width="34"
      height="29"
      viewBox="0 0 34 29"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="14.5" x2="34" y2="14.5" gradientUnits="userSpaceOnUse">
          <stop offset="21.627%" stopColor="#faaf3f" />
          <stop offset="49.519%" stopColor="#ffd691" />
          <stop offset="81.684%" stopColor="#faaf3f" />
        </linearGradient>
      </defs>
      {/* Monitor outer frame */}
      <rect x="1.5" y="4.5" width="26" height="18" rx="2" stroke={`url(#${gid})`} strokeWidth="1.2" fill="none" />
      {/* Monitor stand stem */}
      <line x1="14.5" y1="22.5" x2="14.5" y2="26" stroke={`url(#${gid})`} strokeWidth="1.2" strokeLinecap="round" />
      {/* Monitor stand base */}
      <line x1="10" y1="26" x2="19" y2="26" stroke={`url(#${gid})`} strokeWidth="1.2" strokeLinecap="round" />
      {/* FHD label */}
      <text
        x="13"
        y="16"
        textAnchor="middle"
        fontSize="7.96"
        fontFamily="Poppins, sans-serif"
        fontWeight="600"
        fill={`url(#${gid})`}
      >
        FHD
      </text>
      {/* Sparkle star top-right — 4-point */}
      <g transform="translate(27, 5)">
        <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke={`url(#${gid})`} strokeWidth="1" strokeLinecap="round" />
        <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke={`url(#${gid})`} strokeWidth="1" strokeLinecap="round" />
        <line x1="-2" y1="-2" x2="2" y2="2" stroke={`url(#${gid})`} strokeWidth="0.7" strokeLinecap="round" />
        <line x1="2" y1="-2" x2="-2" y2="2" stroke={`url(#${gid})`} strokeWidth="0.7" strokeLinecap="round" />
      </g>
    </svg>
  );
};
