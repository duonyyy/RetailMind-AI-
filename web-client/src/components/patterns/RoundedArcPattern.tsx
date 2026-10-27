import React, { useId } from "react";

export interface RoundedArcPatternProps extends React.SVGProps<SVGSVGElement> {
  opacity?: number;
  showBackground?: boolean;
  strokeColor?: string;
  position?: "top-right" | "top-left" | "bottom-right" | string;
}

/**
 * 05. Rounded Arc Pattern — Họa tiết đường cong bo góc
 * Source: references/02-background-patterns.png (Panel 05)
 * Oversized curved arcs sweeping across frame edges, multilayered strokes & precision accent lines.
 */
export function RoundedArcPattern({
  opacity = 1,
  showBackground = true,
  strokeColor,
  position,
  className = "",
  style,
  ...rest
}: RoundedArcPatternProps) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `rap-grad-${uid}`;
  const fadeId = `rap-fade-${uid}`;
  const clipId = `rap-clip-${uid}`;

  const accent1 = strokeColor || "#3F7EFA";
  const accent2 = strokeColor || "#5192FF";
  const accent3 = strokeColor || "#63BEFB";

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
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="55%" stopColor="#388CFA" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id={fadeId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9FCAFF" />
          <stop offset="100%" stopColor="#86E5FA" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect width="720" height="420" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {showBackground && <rect width="720" height="420" fill="#F8FAFC" />}

        {/* Left Sweeping Arc Cluster */}
        <path
          d="M-160 50 Q220 -10 237 341 L237 510"
          fill="none"
          stroke="#CFE4FF"
          strokeWidth="170"
          opacity="0.85"
        />
        <path
          d="M-160 80 Q170 30 183 310 L183 510"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="92"
          opacity="0.68"
        />
        <path
          d="M-190 65 Q185 10 214 360 L214 510"
          fill="none"
          stroke={accent1}
          strokeWidth="1.5"
        />

        {/* Top-Right Sweeping Arc */}
        <path
          d="M448 -170 L448 45 Q448 225 640 225 L822 225"
          fill="none"
          stroke="#E3F1FF"
          strokeWidth="160"
          opacity="0.9"
        />
        <path
          d="M450 -170 L450 47 Q450 234 648 235 L822 235"
          fill="none"
          stroke={accent2}
          strokeWidth="1.7"
        />

        {/* Bottom-Right Sweeping Arc */}
        <path
          d="M720 310 Q560 270 554 445 L554 535"
          fill="none"
          stroke={`url(#${fadeId})`}
          strokeWidth="170"
          opacity="0.7"
        />
        <path
          d="M720 311 Q559 271 554 446 L554 535"
          fill="none"
          stroke={accent3}
          strokeWidth="1.2"
        />
      </g>
    </svg>
  );
}
