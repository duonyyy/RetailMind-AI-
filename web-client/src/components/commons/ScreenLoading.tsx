'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface ScreenLoadingProps {
  message?: string;
  className?: string;
}

export function ScreenLoading({
  message = 'Đang tải dữ liệu từ máy chủ...',
  className = '',
}: ScreenLoadingProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 space-y-4 rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur-sm ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
        <RefreshCw className="w-5 h-5 text-cyan-400 absolute animate-pulse" />
      </div>
      <p className="text-sm font-medium text-slate-400 tracking-wide">{message}</p>
    </div>
  );
}
