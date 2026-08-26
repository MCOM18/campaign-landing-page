"use client";

import { FreeTrialForm } from "@/components/FreeTrialForm";
import { GoldRestrictionModal } from "@/components/GoldRestrictionModal";
import { JojoLogo } from "@/components/Icons";
import { OtpVerification } from "@/components/OtpVerification";
import PageSkeleton from "@/components/PageSkeleton";
import { useGetCountries } from "@/features/auth/hooks/useOtpLogin";
import { completeOtpVerification, initiateOtpFlow } from "@/features/auth/services/auth.service";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { appConfig, AppConfig } from "@/lib/config/app.config";
import { resolveContentByPath } from "@/lib/content/resolveContentByPath";
import { DEFAULT_HEADER_VALUES } from "@/lib/constants/headers";
import { REGEX } from "@/lib/constants/regex";
import { logger } from "@/lib/logger/logger";
import { trackEvent } from "@/services/analytics/events";
import { buildDevicePayload } from "@/shared/analytics/utils/buildDevicePayload";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/utils/apiClient";
import { clearUserDataAndReload, getUserGeoLocation } from "@/utils/userUtil";
import Lottie from "lottie-react";
import { useParams, useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import thumbnailsJson from "../../../../public/assets/json/THUMBNAILS SCROLL ANIMATION.json";

const DEFAULT_PANEL_BG = "rgba(48, 24, 11, 1)";

// This app builds as a static export, so the server only ever generates a "default"
// placeholder page for this route. The real path the visitor requested must be read
// from the browser's own URL instead of the route params.
const getMoviePathname = (
    resolvedParams?: { slug?: string } | null,
    routeParams?: any
): string => {
    if (typeof window !== "undefined") {
        return window.location.pathname;
    }
    const slug = (resolvedParams?.slug || routeParams?.slug || "") as string;
    return slug && slug !== "default" ? `/movies/${slug}` : "";
};

const renderFooterWithLinks = (text: string) => {
    if (!text) return null;

    const termsText = "Terms of Use";
    const privacyText = "Privacy Statement";

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
                <a
                    href="https://jojoapp.in/terms-conditions"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#F26E21", textDecoration: "underline", fontWeight: "600" }}
                >
                    {termsText}
                </a>
                {betweenTermsAndPrivacy}
                <a
                    href="https://jojoapp.in/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#F26E21", textDecoration: "underline", fontWeight: "600" }}
                >
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
                <a
                    href="https://jojoapp.in/terms-conditions"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#FAAF3F", textDecoration: "underline", fontWeight: "600" }}
                >
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
                <a
                    href="https://jojoapp.in/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#FAAF3F", textDecoration: "underline", fontWeight: "600" }}
                >
                    {privacyText}
                </a>
                {parts.slice(1).join(privacyText)}
            </>
        );
    }

    return text;
};

interface MovieTitleOverlayProps {
    movieTitle: string;
    movieTitleImage?: string;
    style?: React.CSSProperties;
    imgStyle?: React.CSSProperties;
}

const MovieTitleOverlay: React.FC<MovieTitleOverlayProps> = ({ movieTitle, movieTitleImage, style, imgStyle }) => {
    if (movieTitleImage) {
        return (
            <img
                src={movieTitleImage}
                alt={movieTitle}
                style={{
                    position: "absolute",
                    left: "50%",
                    bottom: "35px",
                    transform: "translateX(-50%)",
                    maxWidth: "70%",
                    pointerEvents: "none",
                    ...imgStyle,
                }}
            />
        );
    }

    if (!movieTitle) return null;

    return (
        <h1
            style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: "18px",
                margin: 0,
                textAlign: "center",
                padding: "0 16px",
                color: "#FFFFFF",
                fontSize: "clamp(32px, 11vw, 52px)",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "1px",
                lineHeight: 1,
                pointerEvents: "none",
                textShadow: "0 2px 4px rgba(0, 0, 0, 0.55), 0 8px 20px rgba(0, 0, 0, 0.55)",
                ...style,
            }}
        >
            {movieTitle}
        </h1>
    );
};

interface MovieHeroMediaProps {
    imageSrc: string;
    videoSrc?: string;
    lottieRef: React.RefObject<any>;
    style?: React.CSSProperties;
}

const MovieHeroMedia: React.FC<MovieHeroMediaProps> = ({ imageSrc, videoSrc, lottieRef, style }) => {
    if (videoSrc) {
        return (
            <video
                src={videoSrc}
                poster={imageSrc || undefined}
                autoPlay
                loop
                muted
                playsInline
                style={{ width: "100%", display: "block", ...style }}
            />
        );
    }

    if (imageSrc) {
        return <img src={imageSrc} alt="Movie" style={{ width: "100%", display: "block", ...style }} />;
    }

    return (
        <Lottie
            lottieRef={lottieRef}
            animationData={thumbnailsJson}
            loop={true}
            onDOMLoaded={() => lottieRef.current?.setSpeed(0.15)}
            style={{ width: "100%", ...style }}
            rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
        />
    );
};

interface MoviePlanCardProps {
    title: string;
    finalPrice: string;
    originalPrice?: string | null;
    badge?: string | null;
    isActive: boolean;
    onClick: () => void;
}

const MoviePlanCard: React.FC<MoviePlanCardProps> = ({
    title,
    finalPrice,
    originalPrice,
    badge,
    isActive,
    onClick,
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: "relative",
                cursor: "pointer",
                flex: 1,
                minWidth: 0,
                background: isActive
                    ? "linear-gradient(24.12deg, rgba(var(--gradient-start-rgb), 0.35) 21.627%, rgba(255, 214, 145, 0.35) 49.519%, rgba(var(--gradient-start-rgb), 0.35) 81.684%), rgb(49, 38, 20)"
                    : "rgba(255, 255, 255, 0.08)",
                border: isActive ? "2px solid var(--gradient-start)" : "none",
                borderRadius: badge ? "0 16px 16px 16px" : "16px",
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "center",
                textAlign: "left",
                boxShadow: isActive
                    ? "0 0 20px rgba(250, 175, 63, 0.18)"
                    : isHovered
                        ? "0 4px 16px rgba(0, 0, 0, 0.4)"
                        : "none",
                transform: isActive
                    ? "translateY(-2px)"
                    : isHovered
                        ? "translateY(-2px)"
                        : "translateY(0)",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
        >
            {badge && (
                <div
                    style={{
                        position: "absolute",
                        top: "-30px",
                        left: "-2px",
                        background: "linear-gradient(24.12deg, var(--gradient-start) 21.627%, var(--gradient-middle) 49.519%, var(--gradient-end) 81.684%)",
                        color: "#000000",
                        fontSize: "11px",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        padding: "6px 10px",
                        borderTopLeftRadius: "12px",
                        borderTopRightRadius: "8px",
                        borderBottomLeftRadius: "0px",
                        borderBottomRightRadius: "0px",
                        zIndex: 3,
                        lineHeight: "16px",
                        whiteSpace: "nowrap",
                        userSelect: "none",
                    }}
                >
                    {badge}
                </div>
            )}
            <div
                style={{
                    color: "#FFFFFF",
                    fontSize: "clamp(14px, 1.8vw, 16px)",
                    fontWeight: "600",
                    marginBottom: "8px",
                    letterSpacing: "-0.2px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textAlign: "left",
                    width: "100%",
                }}
            >
                {title}
            </div>
            <div
                style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "8px",
                    flexWrap: "wrap",
                    justifyContent: "flex-start",
                    width: "100%",
                }}
            >
                {originalPrice && originalPrice !== finalPrice && (
                    <span
                        style={{
                            color: "rgba(255, 255, 255, 0.45)",
                            fontSize: "clamp(13px, 1.5vw, 15px)",
                            fontWeight: "500",
                            textDecoration: "line-through",
                            textAlign: "left",
                        }}
                    >
                        {originalPrice}
                    </span>
                )}
                <span
                    style={{
                        color: "#FFFFFF",
                        fontSize: "clamp(24px, 3.2vw, 30px)",
                        fontWeight: "700",
                        letterSpacing: "-0.5px",
                        lineHeight: 1.1,
                        textAlign: "left",
                    }}
                >
                    {finalPrice}
                </span>
            </div>
        </div>
    );
};

interface MovieCampaignClientProps {
    params: Promise<{ slug: string }>;
}

export default function MovieCampaignClient({ params }: MovieCampaignClientProps) {
    const router = useRouter();
    const routeParams = useParams();
    const resolvedParams = params ? use(params) : null;

    const pathname = getMoviePathname(resolvedParams, routeParams);

    const { isAppReady } = useBootstrap();
    const { data: countries = [] } = useGetCountries();
    const setAuth = useAuthStore((state) => state.setAuth);

    // Movie content resolved directly from appConfig's devices.platform.misc[].campaign-object,
    // matched against the browser pathname (e.g. "/movies/dhabkaaro" -> path "movies/dhabkaaro").
    const contentResult = isAppReady
        ? resolveContentByPath(pathname, { movies: AppConfig.movies, shows: AppConfig.shows })
        : undefined;
    const movieCampaign = contentResult?.type === "movie" ? contentResult.data : undefined;

    // Redirect home if the path doesn't resolve to a configured movie
    useEffect(() => {
        if (isAppReady && !movieCampaign) {
            router.replace("/");
        }
    }, [isAppReady, movieCampaign, router]);

    // Movie media/theme values derived from the resolved campaign config
    const MOVIE_TITLE = movieCampaign?.title || "";
    const MOVIE_IMAGE = movieCampaign
        ? `${movieCampaign.imageBaseUrl || ""}${movieCampaign.images?.poster || ""}`
        : "";
    const MOVIE_IMAGE_MOBILE = movieCampaign
        ? `${movieCampaign.imageBaseUrl || ""}${movieCampaign.images?.posterMobile || movieCampaign.images?.poster || ""}`
        : "";
    const MOVIE_TITLE_IMAGE = movieCampaign?.images?.title
        ? `${movieCampaign.imageBaseUrl || ""}${movieCampaign.images.title}`
        : "";
    const MOVIE_VIDEO = movieCampaign?.videos?.trailer || "";
    const MOVIE_VIDEO_MOBILE = movieCampaign?.videos?.trailerMobile || MOVIE_VIDEO;
    const MOVIE_PANEL_BG = movieCampaign?.panel?.background || movieCampaign?.panel?.backgroundHex || DEFAULT_PANEL_BG;

    // Campaign plan data fetched from subscription/allplans-campaign
    const [campaignPlan, setCampaignPlan] = useState<any>(null);
    const [isCampaignLoading, setIsCampaignLoading] = useState(true);
    const [freshPlans, setFreshPlans] = useState<any>(null);

    // Page Flow Steps: "plans" -> "input" -> "otp" -> redirect to /payment
    const [pageStep, setPageStep] = useState<"plans" | "input" | "otp">("plans");
    const [authError, setAuthError] = useState<string | null>(null);
    const [contactInfo, setContactInfo] = useState("");
    const [parsedPhone, setParsedPhone] = useState("");
    const [parsedPhoneCode, setParsedPhoneCode] = useState("");
    const [isExists, setIsExists] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    const [goldSubscriptionInfo, setGoldSubscriptionInfo] = useState<any>(null);
    const [showGoldPopup, setShowGoldPopup] = useState(false);
    const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);

    const lottieMobileRef = useRef<any>(null);
    const lottieDesktopRef = useRef<any>(null);
    const impressionTracked = useRef(false);

    // Restore auth store state on mount if session exists
    useEffect(() => {
        if (typeof window === "undefined") return;
        const sessionId = localStorage.getItem("session_id");
        const userId = localStorage.getItem("user_id");
        const userDataRaw = localStorage.getItem("userData");
        if (sessionId && userId) {
            try {
                const user = userDataRaw ? JSON.parse(userDataRaw) : { id: userId };
                setAuth(user, sessionId, "");
            } catch (e) {
                logger.error("[Auth Restore] Failed to parse userData", e);
            }
        }
    }, [setAuth]);

    // Clean stale payment states on mount
    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const keysToRemove = [
                "selectedPlan",
                "payment_init_data",
                "payment_sToken",
                "payment_sProviderToken",
            ];
            keysToRemove.forEach((key) => {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            });

            const sessionKeysToRemove = [
                "payment_status",
                "payment_success_state",
                "payment_razorpay_id",
                "payment_subscription_id",
                "payment_order_id",
            ];
            sessionKeysToRemove.forEach((key) => sessionStorage.removeItem(key));

            logger.info("[MovieCampaign] Stale payment details cleared.");
        } catch (e) {
            logger.error("[MovieCampaign] Failed to clear storage", e);
        }
    }, []);

    // Fetch /subscription/allplans-campaign after bootstrap is ready
    useEffect(() => {
        if (!isAppReady) return;

        const initPageData = async () => {
            try {
                setIsCampaignLoading(true);
                const geoData = getUserGeoLocation();
                const sessionId = typeof window !== "undefined" ? localStorage.getItem("session_id") : null;

                const payloadPlans = {
                    country: geoData?.country_code || "IN",
                    deviceTypeId: 3,
                    languageId: 1,
                };

                const headersPlans: Record<string, string> = {};
                if (sessionId) {
                    headersPlans.sessionid = sessionId;
                }

                // If user is already logged in, verify subscription on mount
                if (sessionId) {
                    try {
                        const payloadVerify = { countryCode: geoData?.country_code || "IN" };
                        const headersVerify = { sessionid: sessionId };
                        logger.info("[MovieCampaign] Verifying subscription on mount...", {
                            payload: payloadVerify,
                            headers: headersVerify,
                        });

                        const subResponse = await api.post("subscription/verify-subscription", payloadVerify, {
                            headers: headersVerify,
                        });
                        logger.info("[MovieCampaign] Verify Subscription response:", subResponse.data);

                        const subData = subResponse.data?.data;
                        if (subData?.planType === "SVOD") {
                            setGoldSubscriptionInfo(subData.subscription || { plan_name: "JOJO Gold Premium" });
                            setShowGoldPopup(true);
                        }
                    } catch (verErr) {
                        logger.error("[MovieCampaign] Failed to verify subscription on mount:", verErr);
                    }
                }

                // Fetch /subscription/allplans-campaign
                logger.info("[MovieCampaign] Fetching allplans-campaign...", {
                    payload: payloadPlans,
                    headers: headersPlans,
                });
                const response = await api.post("subscription/allplans-campaign", payloadPlans, {
                    headers: headersPlans,
                });
                const data = response.data?.data;
                logger.info("[MovieCampaign] allplans-campaign response:", data);
                setCampaignPlan(data);
                setFreshPlans(data);
            } catch (err: any) {
                logger.error("[MovieCampaign] Failed to initialize allplans-campaign:", err);
            } finally {
                setIsCampaignLoading(false);
            }
        };

        initPageData();
    }, [isAppReady]);

    // Analytics impression tracking
    useEffect(() => {
        if (typeof window === "undefined" || !isAppReady || !movieCampaign || impressionTracked.current) return;
        impressionTracked.current = true;

        try {
            localStorage.setItem("source_link", window.location.href);

            const devicePayload = buildDevicePayload();
            const geoData = getUserGeoLocation();

            const impressionPayload = {
                event_name: "campaign_landing_impression",
                campaign_id: `movie-${movieCampaign.key || movieCampaign.slug}`,
                campaign_name: movieCampaign.title,
                campaign_type: "movie_campaign",
                device_type: DEFAULT_HEADER_VALUES.DEVICE_TYPE_CODE,
                platform: "web",
                os: devicePayload.os || "unknown",
                browser: devicePayload.browser || "unknown",
                language: DEFAULT_HEADER_VALUES.LANGUAGE,
                lat: geoData?.lat || null,
                lng: geoData?.lng || null,
                country: geoData?.country_code || "IN",
                timestamp: new Date().toISOString(),
            };

            logger.info("[MovieCampaign Analytics] Impression event:", impressionPayload);
            trackEvent("campaign_landing_impression", impressionPayload);
        } catch (err) {
            logger.error("[MovieCampaign Analytics] Error tracking impression:", err);
        }
    }, [isAppReady, movieCampaign]);

    useEffect(() => {
        if (lottieDesktopRef.current) {
            lottieDesktopRef.current.setSpeed(0.15);
        }
    }, []);

    useEffect(() => {
        if (lottieMobileRef.current) {
            lottieMobileRef.current.setSpeed(0.15);
        }
    }, []);

    // Dynamic theme
    useEffect(() => {
        const firstGroup = campaignPlan?.aAllSubscriptionPlans?.[0];
        const theme =
            campaignPlan?.sTheme ||
            campaignPlan?.theme ||
            firstGroup?.sTheme ||
            firstGroup?.theme ||
            "theme-default";

        document.body.classList.forEach((cls) => {
            if (cls.startsWith("theme-")) {
                document.body.classList.remove(cls);
            }
        });

        document.body.classList.add(theme);

        return () => {
            document.body.classList.remove(theme);
        };
    }, [campaignPlan]);

    // Features from first product
    const firstGroup = campaignPlan?.aAllSubscriptionPlans?.[0];
    const firstProduct = firstGroup?.aSubscriptionProducts?.[0];
    const activeFeatures: any[] = firstProduct?.aFeatures || [];

    // Flatten all products/skus from allplans-campaign for display
    const flatPlansList: any[] = [];
    if (freshPlans?.aAllSubscriptionPlans) {
        for (const group of freshPlans.aAllSubscriptionPlans) {
            if (group.aSubscriptionProducts) {
                for (const prod of group.aSubscriptionProducts) {
                    if (prod.aProviderSkus) {
                        for (const sku of prod.aProviderSkus) {
                            const planObj = {
                                ...group,
                                oSubscriptionGroup: {
                                    ...group,
                                    oGroupTranslation: group.oGroupTranslation,
                                    aSubscriptionProducts: [
                                        {
                                            ...prod,
                                            aProviderSkus: [sku],
                                            oOfferDetails: sku.oOfferDetails,
                                        },
                                    ],
                                },
                            };
                            flatPlansList.push({
                                uniqueKey: `${group.sGroupId}-${prod.sProductId}-${sku.sUniqueSkuId}`,
                                plan: planObj,
                                product: prod,
                                sku: sku,
                                group: group,
                            });
                        }
                    }
                }
            }
        }
    }

    // Store selected plan in sessionStorage and localStorage whenever selection changes
    useEffect(() => {
        const selected = flatPlansList[selectedPlanIndex];
        if (selected && typeof window !== "undefined") {
            sessionStorage.setItem("selectedPlan", JSON.stringify(selected.plan));
            localStorage.setItem("selectedPlan", JSON.stringify(selected.plan));
        }
    }, [selectedPlanIndex, flatPlansList.length]);

    // When "Upgrade Now" is clicked:
    // If user is already logged in -> verify subscription then proceed to /payment
    // If user is NOT logged in -> open Login Modal (Mobile / Email + OTP)
    const handleSelectPlanAndContinue = async () => {
        const selected = flatPlansList[selectedPlanIndex];
        if (selected && typeof window !== "undefined") {
            sessionStorage.setItem("selectedPlan", JSON.stringify(selected.plan));
            localStorage.setItem("selectedPlan", JSON.stringify(selected.plan));
        }

        const sessionId = typeof window !== "undefined" ? localStorage.getItem("session_id") : null;
        const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

        if (sessionId && userId) {
            try {
                setIsVerifying(true);
                const geoDataVerify = getUserGeoLocation();
                const payloadVerify = { countryCode: geoDataVerify?.country_code || "IN" };
                const headersVerify = { sessionid: sessionId };

                const subResponse = await api.post("subscription/verify-subscription", payloadVerify, {
                    headers: headersVerify,
                });

                const subData = subResponse.data?.data;
                if (subData?.planType === "SVOD") {
                    setGoldSubscriptionInfo(subData.subscription || { plan_name: "JOJO Gold Premium" });
                    setShowGoldPopup(true);
                    setIsVerifying(false);
                    return;
                }
            } catch (verErr) {
                logger.error("[MovieCampaign] Verify subscription error:", verErr);
            } finally {
                setIsVerifying(false);
            }

            router.push("/payment");
        } else {
            // Not logged in -> Transition to inline login on the same page
            setAuthError(null);
            setPageStep("input");
        }
    };

    // Inline Login: Send OTP
    const handleInputSubmit = async (contact: string) => {
        setAuthError(null);
        setIsVerifying(true);

        const isEmail = contact.includes("@");
        let phone = contact.trim();
        let phoneCode = "";

        if (!isEmail) {
            if (phone.startsWith("+")) {
                const clean = phone.substring(1).replace(/\D/g, "");
                let bestMatchCode = "";
                let bestMatchLength = 0;

                const codesToCheck =
                    countries.length > 0
                        ? countries.map((c) => c.phoneCode.replace(/\D/g, ""))
                        : [
                            "91",
                            "1",
                            "44",
                            "971",
                            "61",
                            "65",
                            "60",
                            "966",
                            "965",
                            "968",
                            "973",
                            "974",
                            "92",
                            "880",
                            "977",
                            "94",
                            "254",
                        ];

                for (const code of codesToCheck) {
                    if (clean.startsWith(code) && code.length > bestMatchLength) {
                        bestMatchCode = code;
                        bestMatchLength = code.length;
                    }
                }

                if (bestMatchLength > 0) {
                    phoneCode = `+${bestMatchCode}`;
                    phone = clean.substring(bestMatchLength);
                } else {
                    const match = phone.match(REGEX.COUNTRY_CODE_SPLIT);
                    if (match) {
                        phoneCode = `+${match[1]}`;
                        phone = match[2].replace(REGEX.NON_DIGIT, "");
                    }
                }
            } else {
                const clean = phone.replace(REGEX.NON_DIGIT, "");
                phoneCode = appConfig.DEFAULT_MOBILE_NUMBER_CODE;
                phone = clean;
            }
        }

        try {
            const result = await initiateOtpFlow(phone, phoneCode);
            setContactInfo(contact);
            setParsedPhone(phone);
            setParsedPhoneCode(phoneCode);
            setIsExists(result.isExists);
            setPageStep("otp");
        } catch (err: any) {
            setAuthError(err.message || "Failed to send OTP. Please check your credentials and try again.");
            setPageStep("input");
        } finally {
            setIsVerifying(false);
        }
    };

    // Inline OTP Verification -> Verify Subscription -> Proceed to /payment
    const handleOtpSubmit = async (otpCode: string) => {
        setAuthError(null);
        setIsVerifying(true);

        const safetyTimeout = setTimeout(() => {
            setPageStep("otp");
            setAuthError("Verification took too long. Please try again.");
            setIsVerifying(false);
        }, 15000);

        try {
            const geoData = getUserGeoLocation();
            const response = await completeOtpVerification(
                parsedPhone,
                parsedPhoneCode,
                otpCode,
                !isExists,
                undefined,
                geoData?.country_code || undefined,
                geoData?.region || undefined,
                geoData?.city || undefined,
            );

            const user = {
                id: response.user_id,
                phone: response.phone || "",
                email: response.email || "",
                isGuest: false,
                createdAt: new Date().toISOString(),
            };

            setAuth(user, response.session_id, "");

            if (response.session_id) localStorage.setItem("session_id", response.session_id);
            if (response.user_id) localStorage.setItem("user_id", response.user_id);
            localStorage.setItem("userData", JSON.stringify(user));

            const isEmailLogin = (response.email || contactInfo || parsedPhone || "").includes("@");
            if (!isEmailLogin) {
                const phoneNum = response.phone || parsedPhone || "";
                const phoneCodeNum = response.phone_code || parsedPhoneCode || "";
                if (phoneNum) localStorage.setItem("user_phone", phoneNum);
                if (phoneCodeNum) localStorage.setItem("user_phone_code", phoneCodeNum);
            } else {
                localStorage.removeItem("user_phone");
                localStorage.removeItem("user_phone_code");
            }

            try {
                if (otpCode) useAuthStore.getState().setLoginOtp(otpCode);
            } catch (err) {
                logger.error("[MovieCampaign OTP] Error updating auth store with OTP", err);
            }

            let isGoldUser = false;

            // Call /subscription/verify-subscription
            try {
                const payloadVerify = { countryCode: geoData?.country_code || "IN" };
                const headersVerify = { sessionid: response.session_id };

                logger.info("[MovieCampaign Verify Subscription] Request:", {
                    payload: payloadVerify,
                    headers: headersVerify,
                });

                const subResponse = await api.post("subscription/verify-subscription", payloadVerify, {
                    headers: headersVerify,
                });

                logger.info("[MovieCampaign Verify Subscription] Response:", subResponse.data);

                const subData = subResponse.data?.data;
                if (subData?.planType === "SVOD") {
                    isGoldUser = true;
                    setGoldSubscriptionInfo(subData.subscription || { plan_name: "JOJO Gold Premium" });
                    setShowGoldPopup(true);
                }
            } catch (subErr) {
                logger.error("[MovieCampaign] Failed to verify subscription status:", subErr);
            }

            clearTimeout(safetyTimeout);
            setIsVerifying(false);

            if (!isGoldUser) {
                const selected = flatPlansList[selectedPlanIndex];
                if (selected && typeof window !== "undefined") {
                    sessionStorage.setItem("selectedPlan", JSON.stringify(selected.plan));
                    localStorage.setItem("selectedPlan", JSON.stringify(selected.plan));
                }
                router.push("/payment");
            }
        } catch (err: any) {
            clearTimeout(safetyTimeout);
            setIsVerifying(false);
            setAuthError(err.message || "Invalid OTP code. Please try again.");
            setPageStep("otp");
        }
    };

    const handleResendOtp = async () => {
        setAuthError(null);
        try {
            await initiateOtpFlow(parsedPhone, parsedPhoneCode);
        } catch (err: any) {
            setAuthError(err.message || "Failed to resend OTP. Please try again.");
        }
    };

    if (!isAppReady || isCampaignLoading || !movieCampaign) {
        return <PageSkeleton />;
    }

    return (
        <>
            <main
                className="app-container"
                style={{
                    background: MOVIE_PANEL_BG,
                    minHeight: "100vh",
                }}
            >
                {/* 1. MOBILE VIEW (Visible on screens < 768px) */}
                <div className="mobile-only" style={{ width: "100%" }}>
                    <div
                        style={{
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                    >
                        {/* Poster / Movie Banner */}
                        <div style={{ position: "relative", width: "calc(100% + 3rem)", margin: "-2.5rem -1.5rem 0", aspectRatio: "1 / 1", overflow: "hidden" }}>
                            <MovieHeroMedia
                                imageSrc={MOVIE_IMAGE_MOBILE || MOVIE_IMAGE}
                                videoSrc={MOVIE_VIDEO_MOBILE || MOVIE_VIDEO}
                                lottieRef={lottieMobileRef}
                                style={{ height: "100%", objectFit: "cover" }}
                            />
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: `linear-gradient(180deg, rgba(0, 0, 0, 0) 55%, rgba(48, 24, 11, 0.85) 92%, ${MOVIE_PANEL_BG} 100%)`,
                                    pointerEvents: "none",
                                }}
                            />
                            <MovieTitleOverlay movieTitle={MOVIE_TITLE} movieTitleImage={MOVIE_TITLE_IMAGE} />
                        </div>

                        {/* Dark Content Panel */}
                        <div
                            style={{
                                width: "100%",
                                zIndex: 2,
                                padding: "0px",
                                marginTop: "30px"
                            }}
                        >
                            <div
                                style={{
                                    width: "100%",
                                    background: "var(--theme_12_60, rgba(5, 5, 5, 0.6))",
                                    backdropFilter: "blur(24px)",
                                    WebkitBackdropFilter: "blur(24px)",
                                    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5)",
                                    borderRadius: "28px",
                                    padding: "32px 28px 8px",
                                    position: "relative",
                                    zIndex: 2,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                }}
                            >
                                {/* Logo */}
                                <header
                                    style={{
                                        marginBottom: "2rem",
                                        display: "flex",
                                        justifyContent: "center",
                                        width: "100%",
                                    }}
                                >
                                    <JojoLogo />
                                </header>

                                {/* Content Area: Plans / Login Form / OTP */}
                                <div style={{ width: "100%" }}>
                                    {authError && pageStep !== "otp" && (
                                        <div style={{ color: "#ff4a4a", fontSize: "14px", marginBottom: "1.2rem", width: "100%", textAlign: "center", fontWeight: "500" }}>
                                            {authError}
                                        </div>
                                    )}
                                    {pageStep === "plans" ? (
                                        <div className="fade-in" style={{ width: "100%" }}>
                                            <div
                                                className="plans-selection-container"
                                                style={{
                                                    display: "grid",
                                                    gridTemplateColumns: flatPlansList.length > 1 ? "repeat(2, 1fr)" : "1fr",
                                                    gap: "8px",
                                                    paddingTop: "26px",
                                                    marginBottom: "1.8rem",
                                                    width: "100%",
                                                    alignItems: "stretch",
                                                }}
                                            >
                                                {flatPlansList.map((planObj, idx) => {
                                                    const prod = planObj.product;
                                                    const sku = planObj.sku;
                                                    const pricing = sku?.oPricing || prod?.oPricing || {};
                                                    const symbol = pricing?.sCurrencySymbol || "₹";
                                                    const finalPriceVal = pricing?.nPrice ?? (idx === 0 ? 499 : 99);
                                                    const originalPriceVal = pricing?.nOriginalPrice;

                                                    const validityDays = prod?.nValidityDays || prod?.nValidity || 365;
                                                    const isYearly = validityDays >= 300 || idx === 0;

                                                    const title =
                                                        prod?.sSubProductLabel?.trim() ||
                                                        prod?.oProductTranslation?.sTitle?.trim() ||
                                                        prod?.sTitle?.trim() ||
                                                        prod?.sName?.trim() ||
                                                        (isYearly ? "12 Months" : "1 Month");

                                                    const isPlanActive = selectedPlanIndex === idx;
                                                    const finalPriceStr = `${symbol}${finalPriceVal}`;
                                                    const originalPriceStr =
                                                        originalPriceVal !== undefined && originalPriceVal !== null && originalPriceVal > finalPriceVal
                                                            ? `${symbol}${originalPriceVal}`
                                                            : null;
                                                    const badge = isPlanActive && (isYearly || idx === 0) ? "POCKET FRIENDLY" : null;

                                                    return (
                                                        <MoviePlanCard
                                                            key={planObj.uniqueKey}
                                                            title={title}
                                                            finalPrice={finalPriceStr}
                                                            originalPrice={originalPriceStr}
                                                            badge={badge}
                                                            isActive={isPlanActive}
                                                            onClick={() => setSelectedPlanIndex(idx)}
                                                        />
                                                    );
                                                })}
                                            </div>

                                            {/* Gold Features Row */}
                                            {activeFeatures.length > 0 && (
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        width: "100%",
                                                        marginBottom: "1.8rem",
                                                        gap: "8px",
                                                    }}
                                                >
                                                    {activeFeatures.map((feature: any) => (
                                                        <div key={feature.sFeatureId || feature.sFeatureName} className="feature-card-mobile">
                                                            <img
                                                                src={feature.sFeatureImageUrl}
                                                                alt={feature.sFeatureName}
                                                                style={{ width: "32px", height: "32px", objectFit: "contain" }}
                                                            />
                                                            <span
                                                                className="gold-text-gradient"
                                                                style={{
                                                                    fontSize: "10px",
                                                                    fontWeight: "500",
                                                                    textAlign: "center",
                                                                    lineHeight: "1.3",
                                                                }}
                                                            >
                                                                {feature.sFeatureName}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <button
                                                onClick={handleSelectPlanAndContinue}
                                                className="btn-primary active btn-start-trial"
                                                style={{
                                                    width: "80%",
                                                    display: "block",
                                                    marginLeft: "auto",
                                                    marginRight: "auto",
                                                    padding: "12px",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                Upgrade Now
                                            </button>

                                            {freshPlans?.sFooterNote && (
                                                <p
                                                    style={{
                                                        color: "rgba(255, 255, 255, 0.7)",
                                                        fontSize: "10px",
                                                        lineHeight: "18px",
                                                        textAlign: "left",
                                                        fontWeight: "300",
                                                        width: "100%",
                                                        marginTop: "2.5rem",
                                                        marginBottom: "3.5rem",
                                                        whiteSpace: "pre-line",
                                                    }}
                                                >
                                                    {renderFooterWithLinks(freshPlans.sFooterNote)}
                                                </p>
                                            )}
                                        </div>
                                    ) : pageStep === "input" ? (
                                        <div className="fade-in" style={{ width: "100%", marginBottom: "3rem" }}>
                                            <button
                                                onClick={() => setPageStep("plans")}
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    color: "rgba(255, 255, 255, 0.75)",
                                                    fontSize: "14px",
                                                    fontWeight: "600",
                                                    cursor: "pointer",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    marginBottom: "1.2rem",
                                                    padding: "6px 0",
                                                    transition: "all 0.2s ease-in-out",
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.color = "#FAAF3F")}
                                                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.75)")}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                                </svg>
                                                <span>Change Plan</span>
                                            </button>
                                            <FreeTrialForm
                                                onSubmit={handleInputSubmit}
                                                isLoading={isVerifying}
                                                footerNote={freshPlans?.sFooterNote}
                                                confirmButtonLabel="Proceed to Payment"
                                            />
                                        </div>
                                    ) : (
                                        <div className="fade-in" style={{ width: "100%", marginBottom: "3rem" }}>
                                            <OtpVerification
                                                contactInfo={contactInfo}
                                                onSubmit={handleOtpSubmit}
                                                onBack={() => setPageStep("input")}
                                                onResend={handleResendOtp}
                                                isLoading={isVerifying}
                                                disclaimerText=""
                                                error={authError}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. DESKTOP VIEW (Visible on screens >= 768px) */}
                <div
                    className="desktop-only"
                    style={{
                        width: "100%",
                        minHeight: "100vh",
                        background: MOVIE_PANEL_BG,
                    }}
                >
                    <div
                        style={{
                            width: "100%",
                            minHeight: "100vh",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <div
                            style={{
                                width: "100%",
                                maxWidth: "1360px",
                                margin: "0 auto",
                                padding: "clamp(32px, 6vw, 64px) clamp(24px, 4vw, 48px)",
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "clamp(32px, 5vw, 64px)",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {/* Hero Image Card */}
                            <div
                                style={{
                                    flex: "1 1 360px",
                                    maxWidth: "680px",
                                    minWidth: "260px",
                                    aspectRatio: "1 / 1",
                                    position: "relative",
                                    borderRadius: "24px",
                                    overflow: "hidden",
                                    boxShadow: "0 0 120px rgba(250, 175, 63, 0.2), 0 30px 80px rgba(0, 0, 0, 0.5)",
                                }}
                            >
                                <MovieHeroMedia
                                    imageSrc={MOVIE_IMAGE}
                                    videoSrc={MOVIE_VIDEO}
                                    lottieRef={lottieDesktopRef}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        background: `linear-gradient(180deg, rgba(0, 0, 0, 0) 55%, rgba(48, 24, 11, 0.85) 92%, ${MOVIE_PANEL_BG} 100%)`,
                                        pointerEvents: "none",
                                    }}
                                />
                                <MovieTitleOverlay
                                    movieTitle={MOVIE_TITLE}
                                    movieTitleImage={MOVIE_TITLE_IMAGE}
                                    style={{ fontSize: "clamp(30px, 3.6vw, 46px)" }}
                                />
                            </div>

                            {/* Content */}
                            <div style={{ flex: "1 1 360px", minWidth: "300px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <header style={{ marginBottom: "2.5rem", transform: "scale(1.05)" }}>
                                    <JojoLogo />
                                </header>

                                {pageStep === "plans" && activeFeatures.length > 0 && (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "2.8rem", justifyContent: "center", maxWidth: "480px" }}>
                                        {activeFeatures.map((feature: any) => (
                                            <div
                                                key={feature.sFeatureId || feature.sFeatureName}
                                                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", width: "95px" }}
                                            >
                                                <img
                                                    src={feature.sFeatureImageUrl}
                                                    alt={feature.sFeatureName}
                                                    style={{ width: "32px", height: "32px", objectFit: "contain" }}
                                                />
                                                <span
                                                    className="gold-text-gradient"
                                                    style={{ fontSize: "12px", fontWeight: "600", textAlign: "center", lineHeight: "1.3" }}
                                                >
                                                    {feature.sFeatureName}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ width: "100%", maxWidth: "480px" }}>
                                    {authError && pageStep !== "otp" && (
                                        <div style={{ color: "#ff4a4a", fontSize: "14px", marginBottom: "1.2rem", width: "100%", textAlign: "center", fontWeight: "500" }}>
                                            {authError}
                                        </div>
                                    )}
                                    {pageStep === "plans" ? (
                                        <div className="fade-in" style={{ width: "100%", textAlign: "center" }}>
                                            <div
                                                className="plans-selection-container"
                                                style={{
                                                    display: "grid",
                                                    gridTemplateColumns: flatPlansList.length > 1 ? "repeat(2, 1fr)" : "1fr",
                                                    gap: "14px",
                                                    paddingTop: "26px",
                                                    marginBottom: "1.8rem",
                                                    width: "100%",
                                                    alignItems: "stretch",
                                                }}
                                            >
                                                {flatPlansList.map((planObj, idx) => {
                                                    const prod = planObj.product;
                                                    const sku = planObj.sku;
                                                    const pricing = sku?.oPricing || prod?.oPricing || {};
                                                    const symbol = pricing?.sCurrencySymbol || "₹";
                                                    const finalPriceVal = pricing?.nPrice ?? (idx === 0 ? 499 : 99);
                                                    const originalPriceVal = pricing?.nOriginalPrice;

                                                    const validityDays = prod?.nValidityDays || prod?.nValidity || 365;
                                                    const isYearly = validityDays >= 300 || idx === 0;

                                                    const title =
                                                        prod?.sSubProductLabel?.trim() ||
                                                        prod?.oProductTranslation?.sTitle?.trim() ||
                                                        prod?.sTitle?.trim() ||
                                                        prod?.sName?.trim() ||
                                                        (isYearly ? "12 Months" : "1 Month");

                                                    const isPlanActive = selectedPlanIndex === idx;
                                                    const finalPriceStr = `${symbol}${finalPriceVal}`;
                                                    const originalPriceStr =
                                                        originalPriceVal !== undefined && originalPriceVal !== null && originalPriceVal > finalPriceVal
                                                            ? `${symbol}${originalPriceVal}`
                                                            : null;
                                                    const badge = isPlanActive && (isYearly || idx === 0) ? "POCKET FRIENDLY" : null;

                                                    return (
                                                        <MoviePlanCard
                                                            key={planObj.uniqueKey}
                                                            title={title}
                                                            finalPrice={finalPriceStr}
                                                            originalPrice={originalPriceStr}
                                                            badge={badge}
                                                            isActive={isPlanActive}
                                                            onClick={() => setSelectedPlanIndex(idx)}
                                                        />
                                                    );
                                                })}
                                            </div>

                                            <button
                                                onClick={handleSelectPlanAndContinue}
                                                className="btn-primary active btn-start-trial"
                                                style={{
                                                    width: "auto",
                                                    display: "inline-flex",
                                                    padding: "12px 40px",
                                                    fontWeight: "700",
                                                }}
                                            >
                                                Upgrade Now
                                            </button>

                                            {freshPlans?.sFooterNote && (
                                                <p
                                                    style={{
                                                        color: "rgba(255, 255, 255, 0.7)",
                                                        fontSize: "11px",
                                                        lineHeight: "17px",
                                                        textAlign: "left",
                                                        fontWeight: "400",
                                                        width: "100%",
                                                        marginTop: "1.8rem",
                                                        whiteSpace: "pre-line",
                                                    }}
                                                >
                                                    {renderFooterWithLinks(freshPlans.sFooterNote)}
                                                </p>
                                            )}
                                        </div>
                                    ) : pageStep === "input" ? (
                                        <div className="fade-in" style={{ width: "100%", marginBottom: "3rem" }}>
                                            <button
                                                onClick={() => setPageStep("plans")}
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    color: "rgba(255, 255, 255, 0.75)",
                                                    fontSize: "14px",
                                                    fontWeight: "600",
                                                    cursor: "pointer",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    marginBottom: "1.2rem",
                                                    padding: "6px 0",
                                                    transition: "all 0.2s ease-in-out",
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.color = "#FAAF3F")}
                                                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.75)")}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                                </svg>
                                                <span>Change Plan</span>
                                            </button>
                                            <FreeTrialForm
                                                onSubmit={handleInputSubmit}
                                                isLoading={isVerifying}
                                                footerNote={freshPlans?.sFooterNote}
                                                confirmButtonLabel="Proceed to Payment"
                                            />
                                        </div>
                                    ) : (
                                        <div className="fade-in" style={{ width: "100%", marginBottom: "3rem" }}>
                                            <OtpVerification
                                                contactInfo={contactInfo}
                                                onSubmit={handleOtpSubmit}
                                                onBack={() => setPageStep("input")}
                                                onResend={handleResendOtp}
                                                isLoading={isVerifying}
                                                disclaimerText=""
                                                error={authError}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Gold Subscription Restriction Popup */}
            {showGoldPopup && (
                <div className="success-overlay">
                    <GoldRestrictionModal
                        subscription={goldSubscriptionInfo}
                        title="You're already enjoying JOJO GOLD!"
                        description="An active subscription is already running on your account."
                        onClose={() => {
                            setShowGoldPopup(false);
                        }}
                        onPurchaseAnother={() => {
                            clearUserDataAndReload();
                        }}
                    />
                </div>
            )}
        </>
    );
}
