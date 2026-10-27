import React, { useId } from "react";

interface AnswerGridPatternProps {
  opacity?: number;
  color?: string;
  className?: string;
}

/**
 * AnswerGridPattern
 * Renders a subtle academic pattern of multiple-choice bubbles (A, B, C, D)
 * symbolizing the exam examination domain of ThiSmart.
 */
export function AnswerGridPattern({
  opacity = 0.05,
  color = "currentColor",
  className = "",
}: AnswerGridPatternProps) {
  const rawId = useId();
  const patternId = `answer-pattern-${rawId.replace(/:/g, "")}`;

  return (
    <svg
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full pointer-events-none select-none ${className}`}
      style={{ opacity }}
    >
      <defs>
        <pattern
          id={patternId}
          width={96}
          height={96}
          patternUnits="userSpaceOnUse"
        >
          {/* Subtle grid lines */}
          <path
            d="M 96 0 L 0 0 0 96"
            fill="none"
            stroke={color}
            strokeWidth="0.5"
            strokeDasharray="2 4"
          />

          {/* Row of 4 bubbles: A, B, C, D */}
          <circle cx="20" cy="24" r="6" fill="none" stroke={color} strokeWidth="1" />
          <circle cx="40" cy="24" r="6" fill={color} fillOpacity="0.4" stroke={color} strokeWidth="1" />
          <circle cx="60" cy="24" r="6" fill="none" stroke={color} strokeWidth="1" />
          <circle cx="80" cy="24" r="6" fill="none" stroke={color} strokeWidth="1" />

          {/* Staggered Row 2 */}
          <circle cx="20" cy="72" r="6" fill="none" stroke={color} strokeWidth="1" />
          <circle cx="40" cy="72" r="6" fill="none" stroke={color} strokeWidth="1" />
          <circle cx="60" cy="72" r="6" fill="none" stroke={color} strokeWidth="1" />
          <circle cx="80" cy="72" r="6" fill={color} fillOpacity="0.4" stroke={color} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
