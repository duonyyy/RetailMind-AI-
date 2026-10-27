import React, { useId } from "react";

export interface CircuitBoardPatternProps extends React.SVGProps<SVGSVGElement> {
  opacity?: number;
  showBackground?: boolean;
}

/**
 * Circuit Board Pattern — Vi mạch công nghệ & Giám sát AI
 * Microprocessor bus lines, 45°/90° traces, telemetry junction vias & AI proctoring core.
 * Color tokens: Primary Blue (#2563EB), Cyan Accent (#06B6D4), Ice Blue (#93C5FD / #E0F2FE).
 * Deterministic (SSR-safe), responsive vector SVG with zero click interception.
 */
export function CircuitBoardPattern({
  opacity = 1,
  showBackground = true,
  className = "",
  style,
  ...rest
}: CircuitBoardPatternProps) {
  const uid = useId().replace(/:/g, "");
  const gradTraceId = `cb-trace-${uid}`;
  const gradGlowId = `cb-glow-${uid}`;

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
        <linearGradient id={gradTraceId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#06B6D4" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id={gradGlowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </radialGradient>
      </defs>

      {showBackground && <rect width="720" height="420" fill="#F8FAFC" />}

      {/* Ambient Neural Core Glow */}
      <circle cx="360" cy="210" r="140" fill={`url(#${gradGlowId})`} />
      <circle cx="580" cy="110" r="90" fill={`url(#${gradGlowId})`} />
      <circle cx="140" cy="310" r="90" fill={`url(#${gradGlowId})`} />

      {/* AI Telemetry Central Microchip Footprint (Center Unit) */}
      <g>
        {/* Core IC Chip body */}
        <rect
          x="320"
          y="170"
          width="80"
          height="80"
          rx="10"
          fill="#0F172A"
          stroke="#06B6D4"
          strokeWidth="2"
          opacity="0.9"
        />
        <rect
          x="332"
          y="182"
          width="56"
          height="56"
          rx="6"
          fill="#1E293B"
          stroke="#2563EB"
          strokeWidth="1.5"
          opacity="0.95"
        />
        {/* Central Core Status Node */}
        <circle cx="360" cy="210" r="8" fill="#06B6D4" />
        <circle cx="360" cy="210" r="14" fill="none" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Microchip IC Pins - Top & Bottom */}
        {[-24, -12, 0, 12, 24].map((offset, i) => (
          <React.Fragment key={`pin-tb-${i}`}>
            <line x1={360 + offset} y1="162" x2={360 + offset} y2="170" stroke="#38BDF8" strokeWidth="2" />
            <line x1={360 + offset} y1="250" x2={360 + offset} y2="258" stroke="#38BDF8" strokeWidth="2" />
          </React.Fragment>
        ))}

        {/* Microchip IC Pins - Left & Right */}
        {[-24, -12, 0, 12, 24].map((offset, i) => (
          <React.Fragment key={`pin-lr-${i}`}>
            <line x1="312" y1={210 + offset} x2="320" y2={210 + offset} stroke="#38BDF8" strokeWidth="2" />
            <line x1="400" y1={210 + offset} x2="408" y2={210 + offset} stroke="#38BDF8" strokeWidth="2" />
          </React.Fragment>
        ))}
      </g>

      {/* Main Bus & Circuit Traces */}
      <g stroke={`url(#${gradTraceId})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Bus 1: Top-Left to Center IC */}
        <path d="M 40 80 L 160 80 L 220 140 L 280 140 L 310 170" strokeWidth="2" />
        <path d="M 40 100 L 150 100 L 210 160 L 270 160 L 310 200" strokeWidth="1.5" />
        <path d="M 40 120 L 140 120 L 190 170 L 250 170 L 290 210" strokeWidth="1.5" />

        {/* Bus 2: Bottom-Left to Center IC */}
        <path d="M 40 340 L 180 340 L 240 280 L 300 280 L 320 260" strokeWidth="2" />
        <path d="M 80 380 L 200 380 L 260 320 L 320 320 L 340 260" strokeWidth="1.5" />

        {/* Bus 3: Center IC to Top-Right AI Node */}
        <path d="M 410 180 L 460 130 L 530 130 L 560 100 L 680 100" strokeWidth="2" />
        <path d="M 400 160 L 440 120 L 520 120 L 550 90 L 680 90" strokeWidth="1.5" />
        <path d="M 372 162 L 372 100 L 430 42 L 560 42" strokeWidth="1.5" />

        {/* Bus 4: Center IC to Bottom-Right Video Telemetry */}
        <path d="M 410 230 L 470 290 L 540 290 L 590 340 L 680 340" strokeWidth="2" />
        <path d="M 390 258 L 440 308 L 520 308 L 570 358 L 680 358" strokeWidth="1.5" />
        <path d="M 360 258 L 360 330 L 420 390 L 580 390" strokeWidth="1.5" />

        {/* Peripheral Sub-circuits: North & South */}
        <path d="M 120 40 L 240 40 L 270 70 L 330 70" strokeWidth="1.5" />
        <path d="M 160 240 L 210 240 L 230 260" strokeWidth="1.5" />
        <path d="M 500 210 L 570 210 L 610 250 L 680 250" strokeWidth="2" />
        <path d="M 520 230 L 580 230 L 620 270 L 680 270" strokeWidth="1.5" />
        <path d="M 460 360 L 500 400 L 550 400" strokeWidth="1.5" />
      </g>

      {/* Auxiliary Mini IC Modules */}
      <g>
        {/* Top-Right Secondary Sensor IC */}
        <rect
          x="560"
          y="80"
          width="44"
          height="44"
          rx="6"
          fill="#1E293B"
          stroke="#06B6D4"
          strokeWidth="1.5"
          opacity="0.85"
        />
        <circle cx="582" cy="102" r="5" fill="#38BDF8" />

        {/* Bottom-Left Secondary Telemetry Unit */}
        <rect
          x="120"
          y="290"
          width="40"
          height="40"
          rx="6"
          fill="#1E293B"
          stroke="#2563EB"
          strokeWidth="1.5"
          opacity="0.85"
        />
        <circle cx="140" cy="310" r="4" fill="#60A5FA" />
      </g>

      {/* Solder Vias, Junction Testpads & Telemetry Signal Nodes */}
      <g>
        {[
          // Top Left cluster
          [40, 80, 4, "#06B6D4"],
          [40, 100, 3, "#38BDF8"],
          [40, 120, 3, "#93C5FD"],
          [160, 80, 3.5, "#2563EB"],
          [220, 140, 3.5, "#06B6D4"],
          [280, 140, 3, "#38BDF8"],
          [120, 40, 4, "#2563EB"],
          [240, 40, 3, "#60A5FA"],
          [330, 70, 4, "#06B6D4"],

          // Center & Microchip junction testpads
          [310, 170, 3.5, "#06B6D4"],
          [310, 200, 3, "#38BDF8"],
          [290, 210, 3, "#60A5FA"],
          [320, 260, 3.5, "#06B6D4"],
          [340, 260, 3, "#2563EB"],
          [410, 180, 3.5, "#38BDF8"],
          [400, 160, 3, "#06B6D4"],
          [410, 230, 3.5, "#06B6D4"],
          [390, 258, 3, "#38BDF8"],

          // Bottom Left cluster
          [40, 340, 4, "#2563EB"],
          [80, 380, 3.5, "#38BDF8"],
          [180, 340, 3.5, "#06B6D4"],
          [240, 280, 3, "#60A5FA"],
          [200, 380, 3, "#93C5FD"],
          [260, 320, 3.5, "#2563EB"],
          [160, 240, 3, "#38BDF8"],
          [230, 260, 4, "#06B6D4"],

          // Top Right cluster
          [560, 42, 4, "#06B6D4"],
          [460, 130, 3.5, "#38BDF8"],
          [530, 130, 3, "#2563EB"],
          [680, 90, 3.5, "#60A5FA"],
          [680, 100, 4, "#06B6D4"],

          // Right & Bottom Right cluster
          [500, 210, 3.5, "#2563EB"],
          [570, 210, 3, "#38BDF8"],
          [610, 250, 3.5, "#06B6D4"],
          [680, 250, 4, "#38BDF8"],
          [680, 270, 3.5, "#2563EB"],
          [470, 290, 3.5, "#06B6D4"],
          [540, 290, 3, "#38BDF8"],
          [590, 340, 3.5, "#2563EB"],
          [680, 340, 4, "#06B6D4"],
          [680, 358, 3.5, "#38BDF8"],
          [580, 390, 4, "#06B6D4"],
          [550, 400, 3.5, "#60A5FA"],
        ].map(([cx, cy, r, fill], idx) => (
          <React.Fragment key={`via-${idx}`}>
            {/* Solder Pad Outer Ring */}
            <circle
              cx={cx as number}
              cy={cy as number}
              r={(r as number) + 2.5}
              fill="none"
              stroke={fill as string}
              strokeWidth="1"
              opacity="0.6"
            />
            {/* Center Copper Via */}
            <circle
              cx={cx as number}
              cy={cy as number}
              r={r as number}
              fill={fill as string}
              stroke="#FFFFFF"
              strokeWidth="1"
            />
          </React.Fragment>
        ))}
      </g>
    </svg>
  );
}
