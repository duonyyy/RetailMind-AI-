import React, { useId } from "react";

interface BrandRibbonPatternProps {
  className?: string;
  opacity?: number;
  position?: "left" | "right" | "both";
}

/**
 * BrandRibbonPattern
 * Inspired by ThiSmart's folded geometric "T" layers and academic paper ribbons.
 */
export function BrandRibbonPattern({
  className = "",
  opacity = 0.08,
  position = "right",
}: BrandRibbonPatternProps) {
  const rawId = useId();
  const gradId = `ribbon-grad-${rawId.replace(/:/g, "")}`;

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
      style={{ opacity }}
    >
      <svg
        className={`absolute w-[600px] h-[600px] ${
          position === "left"
            ? "-left-40 -top-20"
            : position === "right"
            ? "-right-40 -top-20"
            : "right-0 top-0"
        }`}
        viewBox="0 0 600 600"
        fill="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="50%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>

        {/* Folded ribbon layers */}
        <path
          d="M 100 50 Q 250 150 400 80 T 550 250 L 520 320 Q 380 180 220 220 Z"
          fill={`url(#${gradId})`}
          fillOpacity="0.45"
        />
        <path
          d="M 180 120 Q 320 220 480 160 T 580 360 L 530 420 Q 360 270 200 300 Z"
          fill={`url(#${gradId})`}
          fillOpacity="0.3"
        />
        <path
          d="M 260 200 Q 380 300 540 260 L 500 360 Q 340 380 220 300 Z"
          fill={`url(#${gradId})`}
          fillOpacity="0.2"
        />
      </svg>
    </div>
  );
}
