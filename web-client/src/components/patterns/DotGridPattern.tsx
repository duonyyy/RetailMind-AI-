import React from "react";

export interface DotGridPatternProps extends React.SVGProps<SVGSVGElement> {
  opacity?: number;
  showBackground?: boolean;
}

const palette = ["#B9D6FF", "#DAE9FF", "#8CC6FA", "#2563EB", "#06B6D4"];

/**
 * 01. Dot Grid — Lưới chấm tri thức
 * Source: references/02-background-patterns.png (Panel 01)
 * 8 rows × 12 cols pastel dots with precise accents in #2563EB and #06B6D4.
 */
export function DotGridPattern({
  opacity = 1,
  showBackground = true,
  className = "",
  style,
  ...rest
}: DotGridPatternProps) {
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
      {showBackground && <rect width="720" height="420" fill="#F8FAFC" />}
      <g>
        {Array.from({ length: 8 }, (_, r) =>
          Array.from({ length: 12 }, (_, c) => {
            const accent = (r * 13 + c * 7) % 19 === 3;
            const cyan = (r * 5 + c * 11) % 23 === 9;
            const color = accent
              ? "#2563EB"
              : cyan
              ? "#06B6D4"
              : palette[(r + c * 2) % 3];
            const radius = accent ? 7 : cyan ? 6 : 4.8;
            const dotOpacity = accent || cyan ? 1 : 0.75;

            return (
              <circle
                key={`${r}-${c}`}
                cx={48 + c * 56}
                cy={48 + r * 47}
                r={radius}
                fill={color}
                opacity={dotOpacity}
              />
            );
          })
        )}
      </g>
    </svg>
  );
}
