import React, { useId } from "react";

export interface SoftWaveDividerPatternProps extends React.SVGProps<SVGSVGElement> {
  opacity?: number;
  showBackground?: boolean;
}

/**
 * 06. Soft Wave Divider — Họa tiết sóng nền mềm mại
 * Source: references/02-background-patterns.png (Panel 06)
 * Organic fluid waves in serene pastel blue and cyan with a sharp white crest contour.
 */
export function SoftWaveDividerPattern({
  opacity = 1,
  showBackground = true,
  className = "",
  style,
  ...rest
}: SoftWaveDividerPatternProps) {
  const uid = useId().replace(/:/g, "");
  const fadeId = `swd-fade-${uid}`;
  const blueId = `swd-blue-${uid}`;
  const clipId = `swd-clip-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 720 420"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none select-none ${className}`}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        opacity,
        ...style,
      }}
      {...rest}
    >
      <defs>
        <linearGradient id={fadeId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9FCAFF" />
          <stop offset="100%" stopColor="#86E5FA" />
        </linearGradient>
        <linearGradient id={blueId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#50CFF1" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect width="720" height="420" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {showBackground && <rect width="720" height="420" fill="#F8FAFC" />}

        {/* Layer 1: Background Soft Blue Wave */}
        <path
          d="M0 137 Q188 -19 385 121 T720 86 L720 420 L0 420 Z"
          fill="#DCEEFF"
          opacity="0.93"
        />

        {/* Layer 2: Midground Cyan-Blue Wash Wave */}
        <path
          d="M0 218 C135 118 229 158 371 253 S603 313 720 185 L720 420 L0 420 Z"
          fill={`url(#${fadeId})`}
          opacity="0.8"
        />

        {/* Layer 3: Deep Vibrant Blue Wave */}
        <path
          d="M0 267 C169 307 258 131 422 188 S610 284 720 246 L720 420 L0 420 Z"
          fill={`url(#${blueId})`}
          opacity="0.78"
        />

        {/* Layer 4: Foreground Pale Blue Wave */}
        <path
          d="M0 351 C134 314 217 215 343 230 S555 392 720 324 L720 420 L0 420 Z"
          fill="#CFEAFF"
          opacity="0.93"
        />

        {/* Layer 5: Dynamic White Contour Wave Crest */}
        <path
          d="M0 256 C141 321 273 172 427 186 S630 285 720 234"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="4"
          opacity="0.92"
        />
      </g>
    </svg>
  );
}
