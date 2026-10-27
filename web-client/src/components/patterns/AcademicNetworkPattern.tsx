import React from "react";

export interface AcademicNetworkPatternProps extends React.SVGProps<SVGSVGElement> {
  opacity?: number;
  showBackground?: boolean;
}

const nodePositions: readonly [number, number, number][] = [
  [55, 164, 7],
  [103, 48, 13],
  [216, 102, 11],
  [254, 215, 18],
  [104, 286, 21],
  [338, 330, 17],
  [420, 272, 8],
  [510, 101, 19],
  [590, 278, 16],
  [610, 47, 9],
  [510, 353, 12],
  [685, 164, 10],
  [198, 343, 5],
  [412, 65, 24],
] as const;

const edges: readonly [number, number][] = [
  [0, 1],
  [0, 3],
  [0, 4],
  [1, 2],
  [1, 3],
  [2, 3],
  [2, 7],
  [3, 4],
  [3, 5],
  [3, 6],
  [4, 12],
  [5, 6],
  [5, 10],
  [6, 7],
  [6, 8],
  [7, 8],
  [7, 9],
  [8, 10],
  [8, 11],
  [9, 11],
  [10, 11],
] as const;

/**
 * 04. Academic Network — Mạng lưới tri thức
 * Source: references/02-background-patterns.png (Panel 04)
 * Connected nodes & subtle edges representing knowledge graphs, analytics & academic mastery.
 */
export function AcademicNetworkPattern({
  opacity = 1,
  showBackground = true,
  className = "",
  style,
  ...rest
}: AcademicNetworkPatternProps) {
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

      {/* Network Edges */}
      <g>
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={nodePositions[a][0]}
            y1={nodePositions[a][1]}
            x2={nodePositions[b][0]}
            y2={nodePositions[b][1]}
            stroke={i % 5 === 0 ? "#38BDF8" : "#93C5FD"}
            strokeWidth={i % 5 === 0 ? 2 : 1.5}
          />
        ))}
      </g>

      {/* Ambient Halo Glow */}
      <circle cx="511" cy="102" r="32" fill="#2563EB" opacity="0.10" />
      <circle cx="254" cy="215" r="28" fill="#06B6D4" opacity="0.08" />

      {/* Network Nodes */}
      <g>
        {nodePositions.map(([x, y, radius], i) => {
          const isSpecialNode = i === 3; // White with blue border
          const isCyanNode = i % 4 === 2;
          const isBlueNode = i % 4 === 3;
          const fillColor = isSpecialNode
            ? "#FFFFFF"
            : isCyanNode
            ? "#06B6D4"
            : isBlueNode
            ? "#2563EB"
            : "#A7D4FE";
          const strokeColor = isSpecialNode ? "#2563EB" : "#FFFFFF";
          const strokeWidth = isSpecialNode ? 4 : 2;

          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={radius}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          );
        })}
      </g>
    </svg>
  );
}
