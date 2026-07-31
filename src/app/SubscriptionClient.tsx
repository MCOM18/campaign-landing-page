"use client";

import { useOverseasDetection } from "@/hooks/useOverseasDetection";
import { useSubscriptionAllPlans } from "@/hooks/useSubscriptionAllPlans";
import { useToastStore } from "@/hooks/useToastStore";
import { useVerifySubscription } from "@/hooks/useVerifySubscription";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { ROUTES } from "@/lib/constants/routes";
import { analyticsService } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";
import { useAuthStore } from "@/store/useAuthStore";
import { JOJOButton, JOJOCustomButton } from "@/ui/JOJOButton";
import JOJOCommonImage, { JOJOImagePreset } from "@/ui/JOJOCommonImage";
import JOJOCommonVideo from "@/ui/JOJOCommonVideo";
import { JOJOModal } from "@/ui/JOJOModal";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Loading from "../app/loading";

const formatPrice = (val: number | undefined | null): string => {
    if (val === undefined || val === null || isNaN(val)) return "";
    const rounded = Math.round(val * 100) / 100;
    return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2);
};

export default function SubscriptionPage() {
    const router = useRouter();
    const storeToken = useAuthStore(state => state.token);
    const sessionId =
        storeToken ||
        (typeof window !== "undefined"
            ? localStorage.getItem("session_id") || localStorage.getItem("auth_token")
            : null);
    const { isAppReady } = useBootstrap();

    // Get country code from overseas detection hook
    const { countryCode, isOverseas } = useOverseasDetection();

    // Fetch plans from API with dynamic country code only when app config is ready
    const { data: plansData, isLoading, error } = useSubscriptionAllPlans(
        {
            country: countryCode,
            deviceTypeId: 3,
            languageId: 1,
        },
        isAppReady
    );


    // Verify existing subscription status
    const { data: subData, isLoading: isSubLoading } = useVerifySubscription(countryCode, sessionId, isAppReady);

    const isGold = useMemo(() => {
        if (!subData?.data) return false;
        const subscription = subData.data.subscription;
        const endDate = subscription?.dEndDate;
        const isExpired = endDate ? new Date(endDate).getTime() < Date.now() : false;
        return !!(subscription && !isExpired);
    }, [subData]);

    // Currency note for overseas users
    const currencyNote = useMemo(() => {
        if (isOverseas && plansData?.groups?.[0]?.products?.[0]?.skus?.[0]) {
            const sku = plansData.groups[0].products[0].skus[0];
            return `Prices shown in ${sku.currency} for your location`;
        }
        return null;
    }, [isOverseas, plansData]);

    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

    // Extract products under the group (e.g. jojo_gold)
    const activeGroup = plansData?.groups?.[0];
    const products = activeGroup?.products ?? [];

    // Default selection to first product when loaded
    const selectedProduct = useMemo(() => {
        if (!products.length) return null;
        if (selectedProductId) {
            return products.find((p) => p.productId === selectedProductId) ?? products[0];
        }
        return products[0];
    }, [products, selectedProductId]);

    // Render Modal immediately if Gold (No skeleton)
    if (isGold) {
        const returnWatchAssetId = typeof window !== "undefined" ? sessionStorage.getItem("return_watch_asset_id") : null;

        const handleAlreadyGoldClose = () => {
            if (returnWatchAssetId) {
                sessionStorage.removeItem("return_watch_asset_id");
                router.replace(ROUTES.WATCH(returnWatchAssetId));
            } else {
                router.replace(ROUTES.HOME);
            }
        };

        return (
            <div className="relative min-h-screen bg-theme_12 flex flex-col items-center justify-center">
                <JOJOModal isOpen={true} onClose={handleAlreadyGoldClose} showCloseButton={true}>
                    <div className="flex flex-col items-center gap-6 py-4">
                        <div className="relative h-12 w-[160px] sm:h-14 sm:w-[200px] flex-shrink-0" style={{ position: "relative" }}>
                            <JOJOCommonImage
                                src={"/assets/images/Logo/JOJO-GOLD.png"}
                                alt={"JOJO Gold"}
                                fill
                                contentMode="contain"
                                priority
                                preset={JOJOImagePreset.Logo}
                                wrapperClassName="w-full h-full"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <h2 className="text-xl sm:text-2xl font-bold text-theme_1 text-center">
                                {"You are already Gold!"}
                            </h2>
                            <p className="text-theme_5 text-sm sm:text-base text-center max-w-sm mx-auto leading-relaxed">
                                {"You already have an active JOJO Gold subscription. Enjoy your premium content!"}
                            </p>
                        </div>
                        <JOJOCustomButton
                            onClick={handleAlreadyGoldClose}
                            size={JOJOButton.Size.L}
                            state={JOJOButton.State.ACTIVE}
                            className="mt-2 rounded-full px-10 w-full max-w-[240px]"
                            style={{
                                background: "linear-gradient(135deg, var(--theme_13) 0%, #d4530d 100%)",
                            }}
                        >
                            {returnWatchAssetId ? "Start Watching" : "Go to Home"}
                        </JOJOCustomButton>
                    </div>
                </JOJOModal>
            </div>
        );
    }

    if (isLoading || isSubLoading) {
        return <Loading />;
    }

    return (
        <div className="relative min-h-screen w-full overflow-x-hidden bg-theme_12 flex flex-col justify-between items-center">
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-8 md:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 w-full">
                <div className="flex flex-col lg:flex-row items-center justify-center gap-8 xl:gap-16 w-full max-w-7xl mx-auto">
                    <div className="hidden lg:flex relative w-full max-w-[480px] xl:max-w-[740px] aspect-[4/3] h-[35rem] rounded-3xl overflow-hidden bg-theme_12 border border-theme_1/5 items-center justify-center flex-shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
                        {plansData?.headerMediaUrl ? (
                            plansData.headerMediaUrl.endsWith(".mp4") || plansData.headerMediaUrl.includes(".m3u8") ? (
                                <JOJOCommonVideo
                                    src={plansData.headerMediaUrl}
                                    fill
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    contentMode="cover"
                                    wrapperClassName="absolute inset-0 w-full h-full"
                                />
                            ) : (
                                <JOJOCommonImage
                                    src={plansData.headerMediaUrl}
                                    alt="Header Media"
                                    fill
                                    contentMode="cover"
                                    wrapperClassName="absolute inset-0 w-full h-full"
                                />
                            )
                        ) : null}
                    </div>
                    <div className="flex flex-col items-center w-full max-w-[520px] gap-6 sm:gap-8">
                        <div className="relative h-10 sm:h-14 md:h-16 w-[160px] sm:w-[200px] md:w-[240px] flex-shrink-0" style={{ position: "relative", minHeight: "40px" }}>
                            <JOJOCommonImage
                                src={"/assets/images/Logo/JOJO-GOLD.png"}
                                alt={"JOJO Gold"}
                                fill
                                contentMode="contain"
                                priority
                                wrapperClassName="w-full h-full min-h-full"
                            />
                        </div>
                        <div className="relative h-6 sm:h-8 w-[200px] sm:w-[260px] flex items-center justify-center flex-shrink-0" style={{ position: "relative", minHeight: "24px" }}>
                            <JOJOCommonImage
                                src={"/assets/images/limited-offer.svg"}
                                alt={"Limited Offer"}
                                fill
                                contentMode="contain"
                                priority
                                wrapperClassName="w-full h-full min-h-full"
                            />
                        </div>

                        {/* Dynamic Feature Icons Row from the selected plan */}
                        <div className="w-full flex justify-between sm:justify-evenly px-2">
                            {selectedProduct?.features?.map((feature, idx) => (
                                <div key={feature.featureId || idx} className="flex flex-col items-center text-center gap-2">
                                    <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0" style={{ position: "relative", width: "40px", height: "40px" }}>
                                        <JOJOCommonImage
                                            src={feature?.featureImageUrl}
                                            alt={feature?.featureName}
                                            fill
                                            contentMode="contain"
                                            wrapperClassName="w-full h-full min-h-full"
                                        />
                                    </div>
                                    <p className="gold-text-gradient font-medium text-[10px] sm:text-xs leading-snug whitespace-pre-line tracking-wide">
                                        {feature?.featureName ? feature.featureName.replace("Upto", "upto") : ""}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* ── Plan Cards ── */}
                        <div
                            className={`
                                w-full mt-8
                                ${products.length >= 3 ? "flex flex-col gap-4" : "flex gap-4 sm:gap-6"}
                            `}
                        >
                            {products?.map((product) => {
                                const isSelected = product.productId === selectedProduct?.productId;
                                const sku = product.skus?.[0];
                                if (!sku) return null;

                                // Calculate prices dynamically and format floating point savings
                                const originalPrice = Math.round(sku.price * (1 + product.displayMarkupPercent / 100));
                                const savings = Math.max(0, Math.round((originalPrice - sku.price) * 100) / 100);

                                // Extract tag badge details if any (only show if card is selected)
                                const badge = isSelected ? sku.offer?.tagName : null;
                                const isMultiMonth = product.validityCount > 1;
                                const has3OrMorePlans = products.length >= 3;

                                // Custom classes based on selected plan state
                                const cardStyleClass = isSelected
                                    ? isMultiMonth
                                        ? "border-2 border-[#FAAF3F] bg-gradient-to-b from-[#281a0f] to-[#140d07] shadow-[0_12px_40px_rgba(250,175,63,0.2)]"
                                        : "border-2 border-[#f26e21] shadow-[0_12px_40px_rgba(242,110,33,0.2)]"
                                    : isMultiMonth
                                        ? "border border-[#342214] bg-[#1a110a] opacity-80 hover:opacity-100"
                                        : "border border-[#2d190f] bg-[#170d08] opacity-80 hover:opacity-100";

                                // Conditionally flatten card corners when badge is active
                                const cardRoundingClass = badge
                                    ? has3OrMorePlans
                                        ? "rounded-3xl rounded-tr-none"
                                        : "rounded-3xl rounded-tl-none"
                                    : "rounded-3xl";

                                return (
                                    <motion.div
                                        key={product?.productId}
                                        id={`plan-${product?.productId}`}
                                        onClick={() => {
                                            setSelectedProductId(product?.productId);
                                            try {
                                                analyticsService.track(EVENT_NAMES.SVOD_PLAN_SELECTED, {
                                                    product_id: product?.productId,
                                                    plan_name: product?.name || product?.label || '',
                                                    price: product?.skus?.[0]?.price,
                                                });
                                            } catch (e) { }
                                        }}
                                        className={`z-1 
                                            relative w-full cursor-pointer text-left
                                            ${has3OrMorePlans ? "flex flex-row items-center justify-between p-4 sm:p-5" : "flex-1 flex flex-col items-start gap-1 p-4 sm:p-4"}
                                            ${cardRoundingClass}
                                            ${cardStyleClass}
                                        `}
                                        style={{
                                            background: isSelected && !isMultiMonth
                                                ? "var(--theme_12_15_samecolor, rgba(242, 110, 33, 0.15))"
                                                : undefined
                                        }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        animate={{ scale: isSelected ? 1.03 : 1 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    >
                                        {/* Top Badge */}
                                        {badge && (
                                            <motion.span
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                className={`
                                                    absolute -top-[28px] px-4 py-1.5 z-10 rounded-t-xl text-[10px] sm:text-xs font-bold premium-badge-bg text-[#120c07] tracking-wide uppercase
                                                    ${has3OrMorePlans ? "right-[-2px]" : "left-[-2px]"}
                                                `}
                                            >
                                                {badge}
                                            </motion.span>
                                        )}

                                        {has3OrMorePlans ? (
                                            <>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-theme_1 text-base sm:text-lg font-medium tracking-wide">
                                                        {product.label}
                                                    </span>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-theme_7 text-base sm:text-lg line-through font-normal">
                                                            {sku.currencySymbol}{formatPrice(originalPrice)}
                                                        </span>
                                                        <span className="text-theme_1 text-xl sm:text-2xl font-bold tracking-tight">
                                                            {sku.currencySymbol}{formatPrice(sku.price)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <span
                                                        className={`
                                                            inline-flex px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold
                                                            ${isMultiMonth ? "text-theme_12" : "text-theme_13"}
                                                        `}
                                                        style={{
                                                            background: isMultiMonth
                                                                ? "var(--gold-text-gradient)"
                                                                : "var(--theme_12_15_samecolor, rgba(242, 110, 33, 0.15))"
                                                        }}
                                                    >
                                                        {product.priceDisplayNote} {sku.currencySymbol}{formatPrice(savings)}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* Plan Name */}
                                                <span className="text-theme_1 text-base sm:text-lg font-medium tracking-wide">
                                                    {product.label || product.name || (product.validityDays === 365 ? "Yearly Plan" : "Monthly Plan")}
                                                </span>

                                                {/* Pricing Block */}
                                                <div className="flex items-baseline gap-2 w-full">
                                                    <span className="text-theme_7 text-lg sm:text-xl line-through font-normal">
                                                        {sku.currencySymbol}{formatPrice(originalPrice)}
                                                    </span>
                                                    <span className="text-theme_1 text-2xl sm:text-3xl font-bold tracking-tight">
                                                        {sku.currencySymbol}{formatPrice(sku.price)}
                                                    </span>
                                                </div>

                                                {/* Savings Pill */}
                                                <div className="mt-1">
                                                    <span
                                                        className={`
                                                            inline-flex px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold
                                                            ${isMultiMonth ? "text-theme_12" : "text-theme_13"}
                                                        `}
                                                        style={{
                                                            background: isMultiMonth
                                                                ? "var(--gold-text-gradient)"
                                                                : "var(--theme_12_15_samecolor, rgba(242, 110, 33, 0.15))"
                                                        }}
                                                    >
                                                        {product.priceDisplayNote} {sku.currencySymbol}{formatPrice(savings)}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* ── CTA Button ──────────────────────────────────── */}
                        <JOJOCustomButton
                            id="subscription-proceed-btn"
                            onClick={() => {
                                try {
                                    if (selectedProduct) {
                                        analyticsService.track(EVENT_NAMES.SVOD_PURCHASE_STARTED, {
                                            product_id: selectedProduct.productId,
                                            price: selectedProduct.skus?.[0]?.price,
                                        });

                                        // Save selected plan in sessionStorage and redirect to checkout
                                        sessionStorage.setItem("selected_payment_plan", JSON.stringify(selectedProduct));
                                        router.push(ROUTES.PAYMENT);
                                    }
                                } catch (e) { }
                            }}
                            className="
                                w-full
                                h-12 sm:h-13
                                rounded-full
                                body-sm-semibold
                                text-theme_2_same_colour
                                cursor-pointer
                                transition-all duration-300
                                hover:scale-[1.02] hover:shadow-[0_0_32px_rgba(242,110,33,0.35)]
                                active:scale-[0.98]
                            "
                            style={{
                                background:
                                    "linear-gradient(135deg, var(--theme_13) 0%, #d4530d 100%)",
                            }}
                        >
                            {"Upgrade Now " + selectedProduct?.skus?.[0]?.currencySymbol + formatPrice(selectedProduct?.skus?.[0]?.price ?? 0)}
                        </JOJOCustomButton>
                        {currencyNote && (
                            <p className="text-center text-[11px] sm:text-xs text-theme_7 mt-2 tracking-wide">
                                {currencyNote}
                            </p>
                        )}
                    </div>
                </div>
            </div>
            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-0 pb-12 flex flex-col gap-3 text-left">

                {plansData?.footerNote && (
                    <p
                        className="caption-sm-regular text-theme_7 m-0 mt-2 leading-relaxed max-w-5xl whitespace-pre-line"
                        dangerouslySetInnerHTML={{ __html: renderFooterNote(plansData.footerNote) }}
                    />
                )}
            </div>

            <div className="absolute top-[40%] left-0 w-[950px] h-[750px] rounded-full bg-[var(--theme_13)] opacity-[0.14] blur-[130px] pointer-events-none -translate-x-1/2" />
            <div className="absolute bottom-[40%] right-0 w-[1050px] h-[750px] rounded-full bg-[var(--theme_13)] opacity-[0.14] blur-[130px] pointer-events-none translate-x-1/2" />
        </div>
    );
}

function renderFooterNote(text: string): string {
    if (!text) return "";

    let formatted = text;

    // Replace "Terms of Use"
    formatted = formatted.replace(
        /Terms of Use/gi,
        `<a href="/terms-conditions" target="_blank" class="hover:underline font-semibold" style="color: var(--theme_13_samecolour, #F26E21); font-weight: 600;">Terms of Use</a>`
    );

    // Replace "Terms & Conditions"
    formatted = formatted.replace(
        /Terms & Conditions/gi,
        `<a href="/terms-conditions" target="_blank" class="hover:underline font-semibold" style="color: var(--theme_13_samecolour, #F26E21); font-weight: 600;">Terms & Conditions</a>`
    );

    // Replace "Privacy Statement"
    formatted = formatted.replace(
        /Privacy Statement/gi,
        `<a href="/privacy-policy" target="_blank" class="hover:underline font-semibold" style="color: var(--theme_13_samecolour, #F26E21); font-weight: 600;">Privacy Statement</a>`
    );

    // Replace "Privacy Policy"
    formatted = formatted.replace(
        /Privacy Policy/gi,
        `<a href="/privacy-policy" target="_blank" class="hover:underline font-semibold" style="color: var(--theme_13_samecolour, #F26E21); font-weight: 600;">Privacy Policy</a>`
    );

    // Replace Gujarati equivalents
    formatted = formatted.replace(
        /નિયમો અને શરતો/gi,
        `<a href="/terms-conditions" target="_blank" class="hover:underline font-semibold" style="color: var(--theme_13_samecolour, #F26E21); font-weight: 600;">નિયમો અને શરતો</a>`
    );

    formatted = formatted.replace(
        /ઉપયોગની શરતો/gi,
        `<a href="/terms-conditions" target="_blank" class="hover:underline font-semibold" style="color: var(--theme_13_samecolour, #F26E21); font-weight: 600;">ઉપયોગની શરતો</a>`
    );

    formatted = formatted.replace(
        /ગોપનીયતા નીતિ/gi,
        `<a href="/privacy-policy" target="_blank" class="hover:underline font-semibold" style="color: var(--theme_13_samecolour, #F26E21); font-weight: 600;">ગોપનીયતા નીતિ</a>`
    );

    formatted = formatted.replace(
        /ગોપનીયતા નિવેદન/gi,
        `<a href="/privacy-policy" target="_blank" class="hover:underline font-semibold" style="color: var(--theme_13_samecolour, #F26E21); font-weight: 600;">ગોપનીયતા નિવેદન</a>`
    );

    return formatted;
}