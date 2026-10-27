'use client';

import React from 'react';
import { PackageOpen } from 'lucide-react';

interface ScreenEmptyProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function ScreenEmpty({
  title = 'Không tìm thấy dữ liệu',
  description = 'Chưa có bản ghi nào phù hợp với bộ lọc tìm kiếm hiện tại.',
  actionText,
  onAction,
  className = '',
}: ScreenEmptyProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-500">
        <PackageOpen className="w-7 h-7" />
      </div>
      <h4 className="text-base font-semibold text-slate-200">{title}</h4>
      <p className="text-sm text-slate-400 max-w-sm mt-1">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-4 py-2 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors duration-150"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
