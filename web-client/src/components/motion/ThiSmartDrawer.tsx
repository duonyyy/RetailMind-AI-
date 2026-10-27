"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface ThiSmartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

/**
 * M4. Mobile Menu Slide-in Drawer Component
 * Source: references/03-motion-system.png (Panel 04) & docs/MOTION_SPEC.md
 * Specifications:
 *  - Slide direction: Right to Left (translateX(100%) -> translateX(0))
 *  - Duration: ~300ms, easing cubic-bezier(0.22, 1, 0.36, 1)
 *  - Backdrop: Soft dark overlay, fade in/out
 *  - Panel width: min(88vw, 360px)
 *  - Accessibility: role="dialog", aria-modal="true", Escape key, click backdrop, body scroll lock
 */
export function ThiSmartDrawer({
  isOpen,
  onClose,
  title = "Menu điều hướng",
  children,
  className = "",
  showCloseButton = true,
}: ThiSmartDrawerProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Keyboard Escape handler & Body Scroll Lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      // Autofocus close button for accessibility
      setTimeout(() => closeBtnRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop Overlay (Fade In ~300ms) */}
      <div
        data-open={isOpen ? "true" : undefined}
        onClick={onClose}
        aria-hidden="true"
        className="ts-drawer-overlay"
      />

      {/* Drawer Panel (Slide In from Right ~300ms) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-open={isOpen ? "true" : undefined}
        className={`ts-drawer-panel flex flex-col justify-between ${className}`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
            {title}
          </span>
          {showCloseButton && (
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="ts-drawer-close p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Đóng menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {children}
        </div>

        {/* Drawer Footer Tagline */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 text-center">
          ThiSmart • Thi thông minh. Đánh giá chính xác.
        </div>
      </aside>
    </>
  );
}
