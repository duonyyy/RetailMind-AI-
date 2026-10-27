import * as React from "react";
import { DotGridPattern } from "./DotGridPattern";
import { AnswerChoiceGridPattern } from "./AnswerChoiceGridPattern";
import { FoldedRibbonMeshPattern } from "./FoldedRibbonMeshPattern";
import { AcademicNetworkPattern } from "./AcademicNetworkPattern";
import { RoundedArcPattern } from "./RoundedArcPattern";
import { SoftWaveDividerPattern } from "./SoftWaveDividerPattern";
import { CircuitBoardPattern } from "./CircuitBoardPattern";

export type ThiSmartPatternVariant =
  | "dot-grid"
  | "answer-choice-grid"
  | "folded-ribbon-mesh"
  | "academic-network"
  | "rounded-arc"
  | "soft-wave"
  // Semantic domain variants:
  | "flowchart-topology"
  | "circuit-board"
  | "soft-wave-divider";

export interface ThiSmartPatternProps extends React.SVGProps<SVGSVGElement> {
  variant: ThiSmartPatternVariant;
  opacity?: number;
  showBackground?: boolean;
}

/**
 * ThiSmartPattern
 * Master component rendering any of the ThiSmart Background Patterns.
 * Source: references/02-background-patterns.png & docs/PATTERN_SPEC.md
 * Fully vector, scalable, deterministic (no Math.random()), SSR-safe with React useId.
 */
export function ThiSmartPattern({
  variant,
  opacity = 1,
  showBackground = true,
  className = "",
  style,
  ...rest
}: ThiSmartPatternProps) {
  switch (variant) {
    case "dot-grid":
      return (
        <DotGridPattern
          opacity={opacity}
          showBackground={showBackground}
          className={className}
          style={style}
          {...rest}
        />
      );

    case "answer-choice-grid":
      return (
        <AnswerChoiceGridPattern
          opacity={opacity}
          showBackground={showBackground}
          className={className}
          style={style}
          {...rest}
        />
      );

    case "circuit-board":
      return (
        <CircuitBoardPattern
          opacity={opacity}
          showBackground={showBackground}
          className={className}
          style={style}
          {...rest}
        />
      );

    case "flowchart-topology":
    case "academic-network":
      return (
        <AcademicNetworkPattern
          opacity={opacity}
          showBackground={showBackground}
          className={className}
          style={style}
          {...rest}
        />
      );

    case "folded-ribbon-mesh":
      return (
        <FoldedRibbonMeshPattern
          opacity={opacity}
          showBackground={showBackground}
          className={className}
          style={style}
          {...rest}
        />
      );

    case "rounded-arc":
      return (
        <RoundedArcPattern
          opacity={opacity}
          showBackground={showBackground}
          className={className}
          style={style}
          {...rest}
        />
      );

    case "soft-wave-divider":
    case "soft-wave":
      return (
        <SoftWaveDividerPattern
          opacity={opacity}
          showBackground={showBackground}
          className={className}
          style={style}
          {...rest}
        />
      );

    default:
      return null;
  }
}
