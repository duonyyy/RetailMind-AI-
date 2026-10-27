"use client";

import React, { useState } from "react";
import Image from "next/image";

export interface ThiSmartLogoRevealProps {
  theme?: "light" | "dark";
  mode?: "separate" | "full";
  className?: string;
  replayKey?: number | string;
}

/**
 * M1. Logo Reveal / Hero Entrance Component
 * Source: references/03-motion-system.png (Panel 01) & docs/MOTION_SPEC.md
 * Total timeline ~600ms:
 *  - 0ms: Icon starts blurred & scaled down
 *  - ~200ms: Icon appears sharp (scale + fade)
 *  - ~400ms: Wordmark slides from left (-16px) & fades in
 *  - ~600ms: Logo fully complete
 */
export function ThiSmartLogoReveal({
  theme = "light",
  mode = "full",
  className = "",
  replayKey = 0,
}: ThiSmartLogoRevealProps) {
  const isDark = theme === "dark";

  return (
    <div
      key={replayKey}
      className={`inline-flex items-center gap-3 select-none ${className}`}
      aria-label="ThiSmart Logo"
    >
      {mode === "separate" ? (
        <>
          {/* Mark Animation (~200ms) */}
          <div className="ts-logo-mark shrink-0">
            <Image
              src="/brand/logo-mark.png"
              alt="ThiSmart Mark"
              width={48}
              height={48}
              priority
              className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
            />
          </div>

          {/* Wordmark Animation (~400ms-600ms) */}
          <div className="ts-logo-wordmark flex flex-col justify-center">
            <span
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                isDark ? "text-white" : "text-slate-900"
              }`}
              style={{ fontFamily: "var(--ts-font)" }}
            >
              Thi
              <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 bg-clip-text text-transparent">
                Smart
              </span>
            </span>
            <span
              className={`text-[10px] sm:text-[11px] font-medium tracking-wide uppercase ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Thi thông minh. Đánh giá chính xác.
            </span>
          </div>
        </>
      ) : (
        /* Full Official Logo Animation (~600ms) */
        <div className="ts-logo-full">
          <Image
            src={
              isDark
                ? "/brand/logo-horizontal-tagline-dark.png"
                : "/brand/logo-horizontal-tagline-light.png"
            }
            alt="ThiSmart — Thi thông minh. Đánh giá chính xác."
            width={1448}
            height={481}
            priority
            className="h-10 sm:h-12 w-auto object-contain max-w-[280px] sm:max-w-[340px]"
          />
        </div>
      )}
    </div>
  );
}
