import React from 'react';

export type OrderStatusType = 'placed' | 'confirmed' | 'cancelled';

interface OrderStatusTagProps {
  status: OrderStatusType;
  className?: string;
}

const STATUS_CONFIG: Record<
  OrderStatusType,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  placed: {
    label: 'Chờ xác nhận',
    bg: 'bg-cyan-950/40',
    text: 'text-cyan-300',
    border: 'border-cyan-800/50',
    dot: 'bg-cyan-400',
  },
  confirmed: {
    label: 'Đã xác nhận',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-300',
    border: 'border-emerald-800/50',
    dot: 'bg-emerald-400',
  },
  cancelled: {
    label: 'Đã hủy',
    bg: 'bg-rose-950/40',
    text: 'text-rose-300',
    border: 'border-rose-800/50',
    dot: 'bg-rose-400',
  },
};

export function OrderStatusTag({ status, className = '' }: OrderStatusTagProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.placed;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      {config.label}
    </span>
  );
}
