'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BrandSectionBackground } from '@/components/patterns';
import { KeyRound, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSent(true);
  };

  return (
    <BrandSectionBackground
      variant="soft-blue"
      pattern="ribbon"
      patternOpacity={0.07}
      withGlow={true}
      className="min-h-full p-6 sm:p-10 flex items-center justify-center"
    >
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-7 shadow-xl space-y-5">
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
            <KeyRound className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-extrabold text-slate-900">Khôi Phục Mật Khẩu An Toàn</h1>
          <p className="text-xs text-slate-500">
            Nhập Email hoặc Số điện thoại đã đăng ký để nhận mã xác thực OTP hiệu lực 5 phút.
          </p>
        </div>

        {sent ? (
          <div className="ts-badge-success p-4 rounded-xl text-xs space-y-2 text-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
            <div className="font-bold">Đã gửi hướng dẫn đặt lại mật khẩu!</div>
            <p className="text-slate-600">
              Vui lòng kiểm tra hộp thư <strong>{email}</strong> để hoàn tất khôi phục.
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Email hoặc SĐT:</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@mwg-retailmind.vn"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button type="submit" className="ts-cta w-full py-2.5 text-xs font-bold">
              Gửi Mã Khôi Phục OTP
            </button>
          </form>
        )}

        <div className="pt-3 border-t border-slate-100 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại trang đăng nhập</span>
          </Link>
        </div>
      </div>
    </BrandSectionBackground>
  );
}

