import { useState, useEffect } from "react";
import { decryptAES } from "../../utils/decryptAES";
import { env } from "../../lib/config/env";

const secretKey = env.secretKey;
const ivKey = env.ivKey;

function getFlagEmoji(countryCode: string) {
  if (!countryCode) return "";
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

interface PhoneCollectModalProps {
  onComplete: (phone: string, phoneCode: string) => void;
}

const PhoneCollectModal: React.FC<PhoneCollectModalProps> = ({ onComplete }) => {
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Load countries from localStorage cache (same as Login page)
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const encryptedLocalData = localStorage.getItem("countries");
        const dataVersion = localStorage.getItem("countries_version");

        if (encryptedLocalData && dataVersion === "v1") {
          const decrypted = await decryptAES(encryptedLocalData, secretKey, ivKey);
          const list = decrypted?.data || [];
          if (Array.isArray(list) && list.length > 0) {
            setCountries(list);
            // Default to India (+91) or first entry
            const india = list.find((c: any) => c.country_code === "IN") || list[0];
            setSelectedCountry(india);
            return;
          }
        }
      } catch (err) {
        console.error("PhoneCollectModal: failed to load countries", err);
      }
    };

    loadCountries();
  }, []);

  const filteredCountries = countries.filter((c: any) =>
    c.country_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone_code?.includes(searchQuery)
  );

  const handleContinue = () => {
    const digitsOnly = phone.replace(/\D/g, "");
    if (!phone.trim()) {
      setPhoneError("Phone number is required");
      return;
    }
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      setPhoneError("Enter a valid phone number (7–15 digits)");
      return;
    }
    setPhoneError("");

    const phoneCode = selectedCountry?.phone_code || "+91";
    localStorage.setItem("user_phone", digitsOnly);
    localStorage.setItem("user_phone_code", phoneCode);

    onComplete(digitsOnly, phoneCode);
  };

  return (
    <div className="phone-modal-overlay">
      <div className="phone-modal">
        <h2 className="phone-modal-title">Enter Your Mobile Number</h2>
        <p className="phone-modal-subtitle">
          Required to process your payment securely
        </p>

        <div className="phone-modal-input-row" style={{ position: "relative" }}>
          {/* Country code picker */}
          <div
            className="phone-modal-country-btn"
            onClick={() => setIsDropdownOpen((v) => !v)}
          >
            <span>{getFlagEmoji(selectedCountry?.country_code || "IN")}</span>
            <span className="phone-modal-code">
              {selectedCountry?.phone_code || "+91"}
            </span>
            <svg
              className={`phone-modal-chevron ${isDropdownOpen ? "open" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {/* Phone input */}
          <input
            type="tel"
            className={`phone-modal-input ${phoneError ? "input-error" : ""}`}
            placeholder="Phone number"
            value={phone}
            maxLength={15}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setPhone(val);
              if (phoneError) setPhoneError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleContinue()}
          />

          {/* Country dropdown */}
          {isDropdownOpen && (
            <div className="phone-modal-dropdown">
              <div className="phone-modal-search-wrapper">
                <input
                  type="text"
                  placeholder="Search country..."
                  className="phone-modal-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="phone-modal-dropdown-list">
                {filteredCountries.map((country: any, i: number) => (
                  <div
                    key={i}
                    className={`phone-modal-dropdown-item ${
                      selectedCountry?.country_code === country.country_code
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedCountry(country);
                      setIsDropdownOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <span>{getFlagEmoji(country.country_code)}</span>
                    <span className="phone-modal-country-name">
                      {country.country_name}
                    </span>
                    <span className="phone-modal-country-code">
                      {country.phone_code}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {phoneError && <p className="card-error-text mt-2">{phoneError}</p>}

        <button className="phone-modal-btn" onClick={handleContinue}>
          Continue
        </button>
      </div>
    </div>
  );
};

export default PhoneCollectModal;
