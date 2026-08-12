"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface CoverflowCarouselProps {
  images?: string[];
  autoPlayInterval?: number;
}

const DEFAULT_IMAGES = [
  "https://cdn.thesupercms.com/promo_web/FPM_eng_500X750_new.png",
  "https://cdn.thesupercms.com/app_media/kya_che_naggi_gotilo_eng_500x750.png",
  "https://cdn.thesupercms.com/app_media/misri_guj_500x750.png"
];

export const CoverflowCarousel: React.FC<CoverflowCarouselProps> = ({
  images = DEFAULT_IMAGES,
  autoPlayInterval = 3200,
}) => {
  const [activeIndex, setActiveIndex] = useState(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const total = images.length;
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep active index valid if image array length changes
  useEffect(() => {
    if (total > 0 && activeIndex >= total) {
      setActiveIndex(0);
    }
  }, [total, activeIndex]);

  const nextSlide = useCallback(() => {
    if (total === 0) return;
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total === 0) return;
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto rotation timer
  const startTimer = useCallback(() => {
    if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    if (total <= 1) return;
    autoPlayTimerRef.current = setInterval(() => {
      nextSlide();
    }, autoPlayInterval);
  }, [autoPlayInterval, nextSlide, total]);

  const resetTimer = useCallback(() => {
    if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    startTimer();
  }, [startTimer]);

  useEffect(() => {
    startTimer();
    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [startTimer]);

  // Touch & Mouse Handlers for Swiping
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (total <= 1) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    setTouchStartX(clientX);
    setTouchEndX(clientX);
    setIsDragging(true);
    setDragOffset(0);
    if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || touchStartX === null) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    setTouchEndX(clientX);
    setDragOffset(clientX - touchStartX);
  };

  const handleTouchEnd = () => {
    if (!isDragging || touchStartX === null || touchEndX === null) return;
    const diff = touchEndX - touchStartX;
    const swipeThreshold = 35; // px

    if (diff < -swipeThreshold) {
      nextSlide();
    } else if (diff > swipeThreshold) {
      prevSlide();
    }

    setIsDragging(false);
    setTouchStartX(null);
    setTouchEndX(null);
    setDragOffset(0);
    resetTimer();
  };

  if (!images || total === 0) return null;

  return (
    <div
      className="coverflow-carousel-wrapper"
      style={{
        width: "100%",
        marginTop: "24px",
        marginBottom: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "pan-y",
      }}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onMouseLeave={() => {
        if (isDragging) handleTouchEnd();
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 3D Stage Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "450px",
          height: "360px",
          perspective: "900px",
          perspectiveOrigin: "50% 50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {images.map((imgUrl, index) => {
          // Circular offset relative to activeIndex for any array length (1, 2, 3, 4, 5, 6, etc.)
          let offset = (index - activeIndex) % total;
          if (offset > total / 2) {
            offset -= total;
          } else if (offset < -total / 2) {
            offset += total;
          }

          const isActive = offset === 0;

          // Dynamic 3D Styles based on circular offset
          let transform = "";
          let zIndex = 1;
          let opacity = 0;
          let filter = "brightness(0.7)";

          if (isActive) {
            transform = `translate3d(0px, 0px, 0px) scale(1) rotateY(0deg)`;
            zIndex = 10;
            opacity = 1;
            filter = "brightness(1)";
          } else if (offset === -1) {
            // Immediate Left card
            transform = `translate3d(-42%, 0px, -60px) scale(0.82) rotateY(20deg)`;
            zIndex = 8;
            opacity = 0.88;
            filter = "brightness(0.75)";
          } else if (offset === 1) {
            // Immediate Right card
            transform = `translate3d(42%, 0px, -60px) scale(0.82) rotateY(-20deg)`;
            zIndex = 8;
            opacity = 0.88;
            filter = "brightness(0.75)";
          } else if (offset === -2) {
            // Second Left card (for 5+ items)
            transform = `translate3d(-75%, 0px, -120px) scale(0.68) rotateY(30deg)`;
            zIndex = 4;
            opacity = 0.45;
            filter = "brightness(0.5)";
          } else if (offset === 2) {
            // Second Right card (for 5+ items)
            transform = `translate3d(75%, 0px, -120px) scale(0.68) rotateY(-30deg)`;
            zIndex = 4;
            opacity = 0.45;
            filter = "brightness(0.5)";
          } else {
            // Further background cards (hidden)
            const sign = offset < 0 ? -1 : 1;
            transform = `translate3d(${sign * 95}%, 0px, -180px) scale(0.5) rotateY(${-sign * 35}deg)`;
            zIndex = 1;
            opacity = 0;
            filter = "brightness(0.3)";
          }

          // Interactive drag feedback offset
          if (isDragging && dragOffset !== 0) {
            const dragFactor = dragOffset * 0.15;
            if (isActive) {
              transform = `translate3d(${dragFactor}px, 0px, 0px) scale(1) rotateY(${dragFactor * 0.1}deg)`;
            }
          }

          return (
            <div
              key={`${imgUrl}-${index}`}
              onClick={() => {
                if (!isActive) {
                  setActiveIndex(index);
                  resetTimer();
                }
              }}
              style={{
                position: "absolute",
                width: "200px",
                height: "305px",
                borderRadius: "10px",
                overflow: "hidden",
                cursor: isActive ? "grab" : "pointer",
                transition: isDragging
                  ? "none"
                  : "transform 0.55s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.55s ease, filter 0.55s ease, z-index 0.55s ease",
                transformStyle: "preserve-3d",
                WebkitTransformStyle: "preserve-3d",
                transform,
                zIndex,
                opacity,
                filter,
                boxShadow: isActive
                  ? "0 16px 36px rgba(0, 0, 0, 0.75), 0 0 20px rgba(242, 110, 33, 0.25)"
                  : "0 10px 24px rgba(0, 0, 0, 0.6)",
              }}
            >
              <img
                src={imgUrl}
                alt={`Movie poster ${index + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  pointerEvents: "none",
                }}
              />
              {/* Darkening overlay for non-active side cards */}
              {!isActive && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.25)",
                    transition: "background-color 0.4s ease",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
