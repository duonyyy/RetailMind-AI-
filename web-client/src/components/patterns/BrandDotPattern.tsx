import React, { useId } from "react";

interface BrandDotPatternProps {
  dotSize?: number;
  gap?: number;
  color?: string;
  opacity?: number;
  className?: string;
}

export function BrandDotPattern({
  dotSize = 1.5,
  gap = 24,
  color = "currentColor",
  opacity = 0.06,
  className = "",
}: BrandDotPatternProps) {
  const rawId = useId();
  const patternId = `dot-pattern-${rawId.replace(/:/g, "")}`;

  return (
    <svg
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full pointer-events-none select-none ${className}`}
      style={{ opacity }}
    >
      <defs>
        <pattern
          id={patternId}
          width={gap}
          height={gap}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={gap / 2} cy={gap / 2} r={dotSize} fill={color} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
