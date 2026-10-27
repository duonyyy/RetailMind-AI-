"use client";

import React from "react";
import Link from "next/link";

export interface ThiSmartCtaButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  target?: string;
  rel?: string;
  "aria-label"?: string;
}

/**
 * M2. CTA Button Hover & Press Component
 * Source: references/03-motion-system.png (Panel 02) & docs/MOTION_SPEC.md
 * States:
 *  - Default: primary gradient, white text, soft shadow
 *  - Hover (100-200ms): scale 1.03, increased shadow
 *  - Press (~100ms): scale 0.97, reduced shadow
 *  - Focus-visible: cyan 3px outline with 4px offset
 *  - Disabled: opacity 0.55, cursor not-allowed, transform disabled
 */
export function ThiSmartCtaButton({
  children,
  variant = "primary",
  size = "md",
  href,
  onClick,
  disabled = false,
  className = "",
  type = "button",
  target,
  rel,
  "aria-label": ariaLabel,
}: ThiSmartCtaButtonProps) {
  const baseClass = variant === "primary" ? "ts-cta" : "ts-cta ts-cta-secondary";
  const sizeClass =
    size === "sm"
      ? "text-xs px-3 py-1.5"
      : size === "lg"
      ? "text-base px-6 py-3.5"
      : ""; // md is default defined by ts-cta css

  const combinedClassName = `${baseClass} ${sizeClass} ${className}`.trim();

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className={combinedClassName}
        onClick={onClick}
        target={target}
        rel={rel}
        aria-label={ariaLabel}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={combinedClassName}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
