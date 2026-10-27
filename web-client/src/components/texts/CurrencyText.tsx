import React from 'react';

interface CurrencyTextProps {
  amount: string | number;
  className?: string;
  showSymbol?: boolean;
}

/**
 * Định dạng tiền tệ VNĐ an toàn số học (Safe Currency Formatter)
 * Nhận giá trị kiểu string hoặc number, hiển thị định dạng chuẩn Việt Nam (24.990.000 ₫)
 * mà không bị sai số dấu phẩy động.
 */
export function CurrencyText({
  amount,
  className = '',
  showSymbol = true,
}: CurrencyTextProps) {
  const numericString = typeof amount === 'number' ? Math.round(amount).toString() : amount;
  // Tách phần nguyên và định dạng dấu chấm phân cách hàng nghìn
  const cleanNumber = numericString.replace(/\D/g, '');
  const formatted = cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return (
    <span className={`font-mono tracking-tight font-semibold text-slate-100 ${className}`}>
      {formatted || '0'}
      {showSymbol && <span className="ml-1 text-xs text-slate-400 font-sans">₫</span>}
    </span>
  );
}
