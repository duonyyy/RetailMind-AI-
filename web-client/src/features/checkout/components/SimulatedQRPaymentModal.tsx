'use client';

import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  ShieldCheck,
  X,
  Building2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export interface SimulatedQRPaymentModalProps {
  isOpen: boolean;
  orderNo: string;
  totalVnd: string;
  formattedTotal: string;
  storeName?: string;
  onSuccess: () => void;
  onClose: () => void;
}

const BANK_INFO = {
  bankName: 'MB Bank (Ngân hàng TMCP Quân Đội)',
  bankCode: 'MB',
  accountNumber: '0908123883',
  accountName: 'CONG TY CP THE GIOI DI DONG (MWG)',
};

export function SimulatedQRPaymentModal({
  isOpen,
  orderNo,
  totalVnd,
  formattedTotal,
  storeName,
  onSuccess,
  onClose,
}: SimulatedQRPaymentModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'VERIFYING' | 'SUCCESS'>('PENDING');
  const [secondsLeft, setSecondsLeft] = useState(900); // 15 minutes TTL

  useEffect(() => {
    if (!isOpen) {
      setPaymentStatus('PENDING');
      setSecondsLeft(900);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSimulatePayment = () => {
    setPaymentStatus('VERIFYING');
    setTimeout(() => {
      setPaymentStatus('SUCCESS');
      setTimeout(() => {
        onSuccess();
      }, 1200);
    }, 1500);
  };

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden my-8">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs border border-white/20">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                <span>Thanh Toán Chuyển Khoản VietQR • Napas247</span>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  Mô phỏng
                </span>
              </h3>
              <p className="text-[11px] text-blue-100/90">
                Tự động đối soát giao dịch qua mã đơn hàng {orderNo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {paymentStatus === 'SUCCESS' ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-extrabold text-slate-900">
                Thanh Toán Napas247 Thành Công!
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Hệ thống đã nhận được số tiền {formattedTotal} cho đơn hàng <strong>{orderNo}</strong>. Đang chuyển đến trang biên nhận...
              </p>
            </div>
          ) : (
            <>
              {/* Countdown Alert */}
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                  <span>Thời gian hiệu lực mã QR:</span>
                </div>
                <span className="font-mono font-extrabold tabular-nums text-sm">
                  {minutes}:{seconds}
                </span>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="relative p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
                  {/* VietQR Header */}
                  <div className="flex items-center justify-between w-full border-b border-slate-100 pb-2 mb-2 text-[10px] font-extrabold text-blue-700">
                    <span>VIETQR</span>
                    <span className="text-slate-400">•</span>
                    <span>NAPAS 247</span>
                  </div>

                  {/* Stylized QR Visual */}
                  <div className="relative w-48 h-48 bg-slate-900 rounded-xl p-2.5 flex items-center justify-center">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full text-white fill-current"
                      shapeRendering="crispEdges"
                    >
                      {/* Top-Left Finder */}
                      <rect x="5" y="5" width="26" height="26" fill="white" />
                      <rect x="9" y="9" width="18" height="18" fill="#0f172a" />
                      <rect x="13" y="13" width="10" height="10" fill="white" />

                      {/* Top-Right Finder */}
                      <rect x="69" y="5" width="26" height="26" fill="white" />
                      <rect x="73" y="9" width="18" height="18" fill="#0f172a" />
                      <rect x="77" y="13" width="10" height="10" fill="white" />

                      {/* Bottom-Left Finder */}
                      <rect x="5" y="69" width="26" height="26" fill="white" />
                      <rect x="9" y="73" width="18" height="18" fill="#0f172a" />
                      <rect x="13" y="77" width="10" height="10" fill="white" />

                      {/* Simulated QR Data Matrix Blocks */}
                      <rect x="36" y="8" width="6" height="6" fill="white" />
                      <rect x="46" y="14" width="6" height="6" fill="white" />
                      <rect x="56" y="8" width="6" height="6" fill="white" />
                      <rect x="36" y="24" width="6" height="6" fill="white" />
                      <rect x="48" y="26" width="6" height="6" fill="white" />
                      <rect x="58" y="20" width="6" height="6" fill="white" />

                      <rect x="8" y="36" width="6" height="6" fill="white" />
                      <rect x="18" y="44" width="6" height="6" fill="white" />
                      <rect x="26" y="38" width="6" height="6" fill="white" />

                      <rect x="68" y="36" width="6" height="6" fill="white" />
                      <rect x="78" y="42" width="6" height="6" fill="white" />
                      <rect x="86" y="36" width="6" height="6" fill="white" />

                      <rect x="36" y="68" width="6" height="6" fill="white" />
                      <rect x="48" y="74" width="6" height="6" fill="white" />
                      <rect x="56" y="68" width="6" height="6" fill="white" />
                      <rect x="40" y="84" width="6" height="6" fill="white" />
                      <rect x="52" y="88" width="6" height="6" fill="white" />

                      <rect x="70" y="68" width="6" height="6" fill="white" />
                      <rect x="82" y="76" width="6" height="6" fill="white" />
                      <rect x="76" y="86" width="6" height="6" fill="white" />
                      <rect x="88" y="84" width="6" height="6" fill="white" />

                      {/* Center Logo Placeholder */}
                      <rect x="38" y="38" width="24" height="24" rx="4" fill="#2563eb" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-xs border border-blue-500 flex items-center justify-center">
                        <span className="font-extrabold text-[10px] text-blue-700 tracking-tighter">
                          MWG
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* QR Footer Info */}
                  <div className="mt-2 text-center">
                    <p className="text-[11px] font-bold text-slate-800">
                      Mở App Ngân Hàng để quét VietQR
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Hỗ trợ hơn 40+ ứng dụng ngân hàng tại Việt Nam
                    </p>
                  </div>
                </div>
              </div>

              {/* Bank Details Table with 1-Click Copy */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Ngân hàng thụ hưởng:</span>
                  <span className="font-bold text-slate-900 text-right">{BANK_INFO.bankName}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Số tài khoản:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 text-sm">
                      {BANK_INFO.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(BANK_INFO.accountNumber, 'accountNumber')}
                      className="p-1 rounded hover:bg-slate-200 text-slate-500 transition"
                      title="Sao chép số tài khoản"
                    >
                      {copiedField === 'accountNumber' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Chủ tài khoản:</span>
                  <span className="font-bold text-slate-900">{BANK_INFO.accountName}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Số tiền thanh toán:</span>
                  <span className="text-base font-extrabold text-blue-600 tabular-nums">
                    {formattedTotal}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Nội dung chuyển khoản (bắt buộc):</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-slate-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      {orderNo}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(orderNo, 'orderNo')}
                      className="p-1 rounded hover:bg-slate-200 text-slate-500 transition"
                      title="Sao chép mã đơn hàng"
                    >
                      {copiedField === 'orderNo' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Simulation CTA Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={paymentStatus === 'VERIFYING'}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
                >
                  {paymentStatus === 'VERIFYING' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang đối soát giao dịch Napas247...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>MÔ PHỎNG QUÉT MÃ &amp; THANH TOÁN (SIMULATE)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition text-center"
                >
                  Thanh toán sau tại quầy siêu thị MWG
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

