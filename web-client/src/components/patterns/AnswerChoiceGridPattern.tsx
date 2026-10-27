import React, { useId } from "react";

export interface AnswerChoiceGridPatternProps extends React.SVGProps<SVGSVGElement> {
  opacity?: number;
  showBackground?: boolean;
}

/**
 * 02. Answer Choice Grid — Họa tiết đáp án trắc nghiệm
 * Source: references/02-background-patterns.png (Panel 02)
 * 4 rows × 3 cols pill cards with radio choice indicators, light blue tint & brand gradients.
 */
export function AnswerChoiceGridPattern({
  opacity = 1,
  showBackground = true,
  className = "",
  style,
  ...rest
}: AnswerChoiceGridPatternProps) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `acg-grad-${uid}`;

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
          <stop offset="55%" stopColor="#087CF5" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>

      {showBackground && <rect width="720" height="420" fill="#F8FAFC" />}

      <g>
        {Array.from({ length: 4 }, (_, r) =>
          Array.from({ length: 3 }, (_, c) => {
            const isSelectedGradient = (r === 0 && c === 1) || (r === 2 && c === 0);
            const isSelectedCyan = (r === 1 && c === 0) || (r === 2 && c === 2);
            const isSelectedPrimary = r === 3 && c === 1;
            const isSoftFilled = (r * 3 + c) % 4 === 2 || (r === 0 && c === 1) || (r === 2 && c === 0) || (r === 3 && c === 2);

            let radioFill = "#FFFFFF";
            let radioStroke = "#80B3FF";
            let radioStrokeWidth = "2.5";

            if (isSelectedGradient) {
              radioFill = `url(#${gradientId})`;
              radioStroke = "none";
              radioStrokeWidth = "0";
            } else if (isSelectedCyan) {
              radioFill = "#06B6D4";
              radioStroke = "none";
              radioStrokeWidth = "0";
            } else if (isSelectedPrimary) {
              radioFill = "#3B82F6";
              radioStroke = "none";
              radioStrokeWidth = "0";
            } else if (isSoftFilled && (r + c) % 2 === 0) {
              radioFill = "#C7E6FF";
              radioStroke = "#80B3FF";
            }

            return (
              <g
                key={`${r}-${c}`}
                transform={`translate(${34 + c * 233} ${44 + r * 88})`}
              >
                {/* Pill Container */}
                <rect
                  width="195"
                  height="61"
                  rx="30.5"
                  fill={isSoftFilled ? "#E5F1FF" : "#FFFFFF"}
                  fillOpacity="0.85"
                  stroke="#BFD9FF"
                  strokeWidth="1.5"
                />

                {/* Radio Indicator */}
                <circle
                  cx="35"
                  cy="30.5"
                  r="13"
                  fill={radioFill}
                  stroke={radioStroke}
                  strokeWidth={radioStrokeWidth}
                />
              </g>
            );
          })
        )}
      </g>
    </svg>
  );
}
