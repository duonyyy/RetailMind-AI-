import React, { useId } from "react";

export interface FoldedRibbonMeshPatternProps extends React.SVGProps<SVGSVGElement> {
  opacity?: number;
  showBackground?: boolean;
}

/**
 * 03. Folded Ribbon Mesh — Lưới dải gấp thương hiệu
 * Source: references/02-background-patterns.png (Panel 03)
 * Intersecting broad diagonal folded ribbons with blue/cyan gradient & rounded fold corners.
 */
export function FoldedRibbonMeshPattern({
  opacity = 1,
  showBackground = true,
  className = "",
  style,
  ...rest
}: FoldedRibbonMeshPatternProps) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `frm-grad-${uid}`;
  const fadeId = `frm-fade-${uid}`;
  const blueId = `frm-blue-${uid}`;
  const clipId = `frm-clip-${uid}`;

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

        {/* Diagonal Ribbon Overlays */}
        <path
          d="M-80 43 L174 191 L455 -24 L760 -24 L290 281 Z"
          fill={`url(#${fadeId})`}
          opacity="0.9"
        />
        <path
          d="M-140 86 L352 362 L352 485 L-140 212 Z"
          fill={`url(#${blueId})`}
          opacity="0.9"
        />
        <path
          d="M115 478 L115 231 Q115 179 165 193 L390 324 Q445 357 445 399 L445 476"
          fill={`url(#${gradientId})`}
          opacity="0.88"
        />
        <path
          d="M440 0 L720 0 L432 179 L194 319 L80 256 Z"
          fill="#DBEAFF"
          opacity="0.76"
        />
        <path
          d="M555 -55 L555 202 Q555 239 598 268 L760 351 L760 168 L687 129 L760 86 L760 -55 Z"
          fill={`url(#${fadeId})`}
          opacity="0.84"
        />
        <path
          d="M565 281 L740 373 L740 435 L526 312 Z"
          fill={`url(#${blueId})`}
          opacity="0.85"
        />
      </g>
    </svg>
  );
}
