"use client";

import React from "react";
import Image from "next/image";

export interface ThiSmartFeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  icon?: React.ElementType;
  imageSrc?: string;
  imageAlt?: string;
  title?: string;
  description?: string;
  selected?: boolean;
  interactive?: boolean;
  className?: string;
  as?: "div" | "article" | "section";
}

/**
 * M3. Feature Card Hover & Glow Component
 * Source: references/03-motion-system.png (Panel 03) & docs/MOTION_SPEC.md
 * States:
 *  - Default: border #DBEAFE, 18px radius, white surface, soft shadow
 *  - Hover (~200ms): translateY(-6px), scale 1.02, increased shadow
 *  - Selected / Active (~300ms): translateY(-8px), scale 1.03, cyan glow
 *  - :focus-within mirrors hover interaction
 */
export function ThiSmartFeatureCard({
  children,
  icon: Icon,
  imageSrc,
  imageAlt,
  title,
  description,
  selected = false,
  interactive = true,
  className = "",
  as: Component = "div",
  ...rest
}: ThiSmartFeatureCardProps) {
  return (
    <Component
      data-selected={selected ? "true" : undefined}
      className={`ts-feature-card ${className}`.trim()}
      {...rest}
    >
      {children ? (
        children
      ) : (
        <div className="space-y-3">
          {imageSrc ? (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50/50 p-1.5 flex items-center justify-center border border-blue-100/80 shadow-xs">
              <Image
                src={imageSrc}
                alt={imageAlt || title || "Tính năng ThiSmart"}
                width={48}
                height={48}
                className="w-full h-full object-contain drop-shadow-xs"
              />
            </div>
          ) : Icon ? (
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Icon className="w-5 h-5" />
            </div>
          ) : null}
          {title && (
            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-xs text-slate-500 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}
    </Component>
  );
}
