import React from "react";
import {
  ThiSmartPattern,
  type ThiSmartPatternVariant,
} from "./ThiSmartPattern";
import { BrandDotPattern } from "./BrandDotPattern";

export type SectionPatternType =
  | "dot"
  | "answer"
  | "ribbon"
  | "arc"
  | "network"
  | "wave"
  | "none"
  | ThiSmartPatternVariant;

export interface BrandSectionBackgroundProps {
  variant?: "light" | "dark-navy" | "soft-blue" | "surface";
  pattern?: SectionPatternType;
  patternOpacity?: number;
  withGlow?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * BrandSectionBackground
 * Wraps page sections with unified brand styling, ambient glows,
 * and vector SVG background patterns without obstructing text readability.
 */
export function BrandSectionBackground({
  variant = "light",
  pattern = "dot",
  patternOpacity,
  withGlow = true,
  className = "",
  children,
}: BrandSectionBackgroundProps) {
  const variantStyles = {
    light: "bg-slate-50 text-slate-900",
    surface: "bg-white text-slate-900",
    "soft-blue": "bg-gradient-to-b from-blue-50/60 via-slate-50 to-white text-slate-900",
    "dark-navy": "bg-[#0F172A] text-slate-100",
  };

  const isDark = variant === "dark-navy";
  const defaultOpacity = isDark ? 0.08 : 0.06;
  const activeOpacity = patternOpacity ?? defaultOpacity;

  // Map legacy pattern names to ThiSmartPatternVariant
  const mapVariant = (): ThiSmartPatternVariant | null => {
    switch (pattern) {
      case "dot":
      case "dot-grid":
        return "dot-grid";
      case "answer":
      case "answer-choice-grid":
        return "answer-choice-grid";
      case "ribbon":
      case "folded-ribbon-mesh":
        return "folded-ribbon-mesh";
      case "arc":
      case "rounded-arc":
        return "rounded-arc";
      case "circuit-board":
        return "circuit-board";
      case "network":
      case "academic-network":
      case "flowchart-topology":
        return "flowchart-topology";
      case "wave":
      case "soft-wave":
      case "soft-wave-divider":
        return "soft-wave-divider";
      case "none":
      default:
        return null;
    }
  };

  const resolvedVariant = mapVariant();

  return (
    <div className={`relative overflow-hidden ${variantStyles[variant]} ${className}`}>
      {/* Ambient Radial Glows */}
      {withGlow && (
        <div
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden pointer-events-none select-none -z-0"
        >
          {isDark ? (
            <>
              <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
              <div className="absolute top-1/2 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-32 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
            </>
          ) : (
            <>
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-blue-100/40 via-cyan-50/20 to-transparent blur-3xl" />
              <div className="absolute top-1/3 -right-24 w-80 h-80 bg-cyan-100/25 rounded-full blur-3xl" />
            </>
          )}
        </div>
      )}

      {/* Pattern Overlay */}
      {resolvedVariant && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none select-none -z-0"
          style={{ opacity: activeOpacity }}
        >
          <ThiSmartPattern
            variant={resolvedVariant}
            showBackground={false}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content wrapper */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
