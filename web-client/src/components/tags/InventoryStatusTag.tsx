import React from 'react';

interface InventoryStatusTagProps {
  availableQuantity: number;
  className?: string;
}

export function InventoryStatusTag({
  availableQuantity,
  className = '',
}: InventoryStatusTagProps) {
  if (availableQuantity <= 0) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-900 border-slate-700 text-slate-400 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
        Tạm hết hàng
      </span>
    );
  }

  if (availableQuantity <= 3) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-950/40 border-amber-800/50 text-amber-300 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
        Sắp hết (còn {availableQuantity})
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-950/40 border-emerald-800/50 text-emerald-300 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      Còn hàng ({availableQuantity})
    </span>
  );
}
