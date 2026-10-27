'use client';

import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ScreenErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ScreenError({
  title = 'Đã xảy ra lỗi kết nối',
  message = 'Không thể đồng bộ dữ liệu với máy chủ. Vui lòng kiểm tra lại đường truyền.',
  onRetry,
  className = '',
}: ScreenErrorProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-xl border border-rose-900/40 bg-rose-950/10 backdrop-blur-sm ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800/50 flex items-center justify-center mb-4 text-rose-400">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h4 className="text-base font-semibold text-rose-200">{title}</h4>
      <p className="text-sm text-slate-400 max-w-sm mt-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 border border-rose-700/50 transition-colors duration-150"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Thử lại
        </button>
      )}
    </div>
  );
}
