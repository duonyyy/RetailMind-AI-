'use client';

import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw } from 'lucide-react';

interface PreviewTokenCountdownProps {
  initialSeconds?: number;
  onExpire?: () => void;
}

/**
 * 10-Minute Pessimistic Stock Hold Countdown (`PreviewTokenCountdown.tsx` per 17-FRONTEND_DESIGN.md)
 * Uses `tabular-nums` per BRAND_AND_DESIGN_TOKENS.md Section 4.
 */
export function PreviewTokenCountdown({
  initialSeconds = 600,
  onExpire,
}: PreviewTokenCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onExpire]);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const isUrgent = secondsLeft <= 120;

  return (
    <div
      className={`flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold ${
        isUrgent
          ? 'bg-amber-50 border-amber-200 text-amber-800'
          : 'bg-blue-50/80 border-blue-200 text-blue-800'
      }`}
    >
      <div className="flex items-center gap-2">
        <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-amber-600 animate-pulse' : 'text-blue-600'}`} />
        <span>Hiệu lực giữ tồn kho khả dụng (Preview Token):</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono font-extrabold text-sm tabular-nums">
          {mins}:{secs}
        </span>
        {secondsLeft === 0 && (
          <button
            type="button"
            onClick={() => setSecondsLeft(600)}
            className="inline-flex items-center gap-1 text-[11px] underline text-blue-700"
          >
            <RefreshCw className="w-3 h-3" /> Gia hạn
          </button>
        )}
      </div>
    </div>
  );
}

