"use client";

import footerData from "@/lib/data/footer.data.json";
import { env } from "@/lib/config/env";

const SOCIAL_ICON_MAP: Record<string, string> = {
  facebook: "/assets/facebook.svg",
  instagram: "/assets/instagram.svg",
  youtube: "/assets/youtube.svg",
  linkdin: "/assets/linkdin.svg",
};

export default function Footer() {
  return (
    <footer className="web-footer-container" style={{ paddingLeft: 0, paddingRight: 0 }}>
      {/* ── MOBILE FOOTER (Screens < 768px): Logo first, then all menus ── */}
      <div className="mobile-footer-wrapper">
        {/* 1. Logo First */}
        <div style={{ marginBottom: "16px" }}>
          <a href="https://jojoapp.in/" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block" }}>
            <img
              src="/assets/plain_logo.svg"
              alt="JOJO Logo"
              style={{ width: "93px", height: "30px", display: "block", cursor: "pointer" }}
            />
          </a>
        </div>

        {/* 2. All Menus After Logo */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
          <a
            href="https://jojoapp.in/terms-conditions"
            target="_blank"
            rel="noopener noreferrer"
            className="web-footer-link"
            style={{ textDecoration: "none" }}
          >
            Terms & Conditions
          </a>
          <a
            href="https://jojoapp.in/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="web-footer-link"
            style={{ textDecoration: "none" }}
          >
            Privacy Policy
          </a>
          <a
            href="https://jojolimited.com/career"
            target="_blank"
            rel="noopener noreferrer"
            className="web-footer-link"
            style={{ textDecoration: "none" }}
          >
            Careers
          </a>
          <a
            href="https://jojolimited.com/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="web-footer-link"
            style={{ textDecoration: "none" }}
          >
            Contact us
          </a>
          <a
            href="https://help.jojoapp.in/en/support/home"
            target="_blank"
            rel="noopener noreferrer"
            className="web-footer-link"
            style={{ textDecoration: "none" }}
          >
            Support
          </a>
        </div>

        {/* 3. Follow us, App downloads & Copyright */}
        <div>
          <span style={{ color: "var(--text-footer)", marginBottom: "0.5rem", fontWeight: 400, fontSize: "14px", display: "block" }}>
            Follow us for more updates
          </span>
          <div style={{ display: "flex", gap: "8px", marginBottom: "1.25rem" }}>
            {footerData.social.platforms.map((platform) => {
              const iconSrc = SOCIAL_ICON_MAP[platform.id];
              if (!iconSrc || !platform.href) return null;
              return (
                <a
                  key={platform.id}
                  href={platform.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={platform.label}
                >
                  <img
                    src={iconSrc}
                    alt={platform.label}
                    style={{ width: "32px", height: "32px", cursor: "pointer" }}
                  />
                </a>
              );
            })}
          </div>

          <span style={{ color: "var(--text-footer)", marginBottom: "0.5rem", fontWeight: 400, fontSize: "14px", display: "block" }}>
            Download the JOJO app
          </span>
          <div style={{ display: "flex", gap: "8px", marginBottom: "1.25rem" }}>
            {/* Google Play Button */}
            <a
              href="https://play.google.com/store/apps/details?id=com.navkarevent.jojo&pcampaignid=web_share%5D"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: "#e2e2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px 10px",
                borderRadius: "4px",
                height: "37px",
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
                <img src="/assets/google_play_logo.png" alt="Google Play Icon" style={{ width: "21px", height: "22px" }} />
                <img src="/assets/google_play_text.svg" alt="Google Play Store" style={{ width: "76.7px", height: "23.5px" }} />
              </div>
            </a>
            {/* App Store Button */}
            <a
              href="https://apps.apple.com/us/app/jojo-app-movies-shows-natak/id1665094876"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: "var(--text-footer)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px 10px",
                borderRadius: "4px",
                height: "37px",
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
                <img src="/assets/apple_logo.svg" alt="Apple Icon" style={{ width: "19.3px", height: "22.6px" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", justifyContent: "center" }}>
                  <img src="/assets/apple_text_line1.svg" alt="Download on the" style={{ width: "72.6px", height: "6.4px" }} />
                  <img src="/assets/apple_text_line2.svg" alt="App Store" style={{ width: "78.8px", height: "15.6px" }} />
                </div>
              </div>
            </a>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", marginTop: "1rem" }}>
            <a
              href="https://jojolimited.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "4px", textDecoration: "none", cursor: "pointer" }}
            >
              <img src="/assets/copyright.svg" alt="Copyright Icon" style={{ width: "14px", height: "14px" }} />
              <span style={{ fontSize: "12px", color: "var(--text-footer)", fontWeight: 400 }}>
                {new Date().getFullYear()} JOJO LIMITED. All the Copyrights Reserved.
              </span>
            </a>
            {env.appVersion && (
              <span style={{ fontSize: "11px", color: "#f26e21", opacity: 0.7, fontWeight: 400 }}>
                v{env.appVersion.replace(/^v/i, "")}
              </span>
            )}
            {env.timestamp && (
              <span style={{ fontSize: "11px", color: "#f26e21", opacity: 0.7, fontWeight: 400 }}>
                {env.timestamp}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── DESKTOP FOOTER (Screens >= 768px): Original 3-Column Grid ── */}
      <div className="desktop-footer-wrapper">
        <div className="web-footer-grid">
          <div className="web-footer-column">
            <a
              href="https://jojoapp.in/terms-conditions"
              target="_blank"
              rel="noopener noreferrer"
              className="web-footer-link"
              style={{ textDecoration: "none" }}
            >
              Terms & Conditions
            </a>
            <a
              href="https://jojoapp.in/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="web-footer-link"
              style={{ textDecoration: "none" }}
            >
              Privacy Policy
            </a>
            <div style={{ marginTop: "1rem" }}>
              <a href="https://jojoapp.in/" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block" }}>
                <img
                  src="/assets/plain_logo.svg"
                  alt="JOJO Logo"
                  style={{ width: "93px", height: "30px", display: "block", cursor: "pointer" }}
                />
              </a>
            </div>
          </div>

          <div className="web-footer-column">
            <a
              href="https://jojolimited.com/career"
              target="_blank"
              rel="noopener noreferrer"
              className="web-footer-link"
              style={{ textDecoration: "none" }}
            >
              Careers
            </a>
            <a
              href="https://jojolimited.com/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="web-footer-link"
              style={{ textDecoration: "none" }}
            >
              Contact us
            </a>
            <a
              href="https://help.jojoapp.in/en/support/home"
              target="_blank"
              rel="noopener noreferrer"
              className="web-footer-link"
              style={{ textDecoration: "none" }}
            >
              Support
            </a>
          </div>

          <div className="web-footer-column">
            <span style={{ color: "var(--text-footer)", marginBottom: "0.5rem", fontWeight: 400 }}>
              Follow us for more updates
            </span>
            <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem" }}>
              {footerData.social.platforms.map((platform) => {
                const iconSrc = SOCIAL_ICON_MAP[platform.id];
                if (!iconSrc || !platform.href) return null;
                return (
                  <a
                    key={platform.id}
                    href={platform.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={platform.label}
                  >
                    <img
                      src={iconSrc}
                      alt={platform.label}
                      style={{ width: "32px", height: "32px", cursor: "pointer" }}
                    />
                  </a>
                );
              })}
            </div>

            <span style={{ color: "var(--text-footer)", marginBottom: "0.5rem", fontWeight: 400 }}>
              Download the JOJO app
            </span>
            <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem" }}>
              <a
                href="https://play.google.com/store/apps/details?id=com.navkarevent.jojo&pcampaignid=web_share%5D"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: "#e2e2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px 10px",
                  borderRadius: "4px",
                  height: "37px",
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
                  <img src="/assets/google_play_logo.png" alt="Google Play Icon" style={{ width: "21px", height: "22px" }} />
                  <img src="/assets/google_play_text.svg" alt="Google Play Store" style={{ width: "76.7px", height: "23.5px" }} />
                </div>
              </a>
              <a
                href="https://apps.apple.com/us/app/jojo-app-movies-shows-natak/id1665094876"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: "var(--text-footer)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px 10px",
                  borderRadius: "4px",
                  height: "37px",
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
                  <img src="/assets/apple_logo.svg" alt="Apple Icon" style={{ width: "19.3px", height: "22.6px" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px", justifyContent: "center" }}>
                    <img src="/assets/apple_text_line1.svg" alt="Download on the" style={{ width: "72.6px", height: "6.4px" }} />
                    <img src="/assets/apple_text_line2.svg" alt="App Store" style={{ width: "78.8px", height: "15.6px" }} />
                  </div>
                </div>
              </a>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", marginTop: "1rem" }}>
              <a
                href="https://jojolimited.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "4px", textDecoration: "none", cursor: "pointer" }}
              >
                <img src="/assets/copyright.svg" alt="Copyright Icon" style={{ width: "14px", height: "14px" }} />
                <span style={{ fontSize: "12px", color: "var(--text-footer)", fontWeight: 400 }}>
                  {new Date().getFullYear()} JOJO LIMITED. All the Copyrights Reserved.
                </span>
              </a>
              {env.appVersion && (
                <span style={{ fontSize: "11px", color: "#f26e21", opacity: 0.7, fontWeight: 400 }}>
                  v{env.appVersion.replace(/^v/i, "")}
                </span>
              )}
              {env.timestamp && (
                <span style={{ fontSize: "11px", color: "#f26e21", opacity: 0.7, fontWeight: 400 }}>
                  {env.timestamp}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
