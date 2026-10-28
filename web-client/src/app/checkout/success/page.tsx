'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BrandSectionBackground } from '@/components/patterns';
import {
  CheckCircle2,
  QrCode,
  Building2,
  ShieldCheck,
  FileDown,
  PackageCheck,
  ArrowRight,
  CreditCard,
  Banknote,
} from 'lucide-react';

function OrderReceiptContent() {
  const searchParams = useSearchParams();
  const orderNo =
    searchParams.get('orderNo') ||
    `MWG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-9812`;
  const total = searchParams.get('total') || '19.239.000 ₫';
  const store = searchParams.get('store') || 'store-hcm-q1';
  const idemKey = searchParams.get('idem') || 'idem-verified-ssot-2026';
  const method = searchParams.get('method') || 'QR_NAPAS247';
  const isPaid = searchParams.get('paid') === 'true';

  const storeMap: Record<string, string> = {
    'store-hcm-q1': '136 Nguyễn Thái Học, Quận 1, TP.HCM (MWG_HCM_001)',
    'store-hn-cg': '117 Thái Hà, Đống Đa, Hà Nội (MWG_HN_002)',
    'store-dn-hc': '320 đường 2/9, Hải Châu, Đà Nẵng (MWG_DN_003)',
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <span className="ts-badge-success px-3 py-1 rounded-full text-xs font-bold inline-block">
          SCR-09 • Biên Nhận Đơn Hàng &amp; Khóa Tồn Thành Công
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Đặt Hàng &amp; Giữ Tồn Kho Thành Công!
        </h1>
        <p className="text-xs text-slate-500">
          Hệ thống PostgreSQL SSOT đã khóa bi quan sản phẩm tại siêu thị dành riêng cho quý khách.
        </p>

        {isPaid && (
          <div className="pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>✓ Đã xác nhận thanh toán trực tuyến qua VietQR Napas247</span>
            </span>
          </div>
        )}
      </div>

      {/* Order Details Box */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <span className="text-slate-500 font-medium">Mã đơn hàng chính thức:</span>
          <span className="font-mono text-base font-extrabold text-blue-600">{orderNo}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Tổng thanh toán (Đã gồm VAT 10%):</span>
          <span className="text-base font-extrabold text-slate-900 tabular-nums">{total}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Hình thức thanh toán:</span>
          <span className="font-bold text-slate-800">
            {method === 'QR_NAPAS247'
              ? isPaid
                ? 'Chuyển khoản QR Napas247 (Đã đối soát thành công ✓)'
                : 'Chuyển khoản QR Napas247 (Thanh toán tại quầy thu ngân)'
              : method === 'COD'
              ? 'Thanh toán tiền mặt khi nhận hàng (COD)'
              : 'Thẻ ATM / Visa / Mastercard'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Điểm nhận siêu thị MWG:</span>
          <span className="font-bold text-slate-800">{storeMap[store] || storeMap['store-hcm-q1']}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Thời gian sẵn sàng nhận máy:</span>
          <span className="font-bold text-emerald-700">Trong vòng 60 phút</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Idempotency-Key chống trùng lặp:</span>
          <span className="font-mono text-[11px] text-slate-600">{idemKey}</span>
        </div>
      </div>

      {/* Pickup QR Verification */}
      <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white rounded-xl border border-blue-200 text-blue-600">
            <QrCode className="w-8 h-8" />
          </div>
          <div className="text-xs space-y-0.5">
            <div className="font-bold text-slate-900">Mã QR Nhận Máy Nhanh Tại Quầy Siêu Thị</div>
            <p className="text-slate-600">
              Xuất trình mã đơn <strong>{orderNo}</strong> tại quầy thu ngân để nhận máy nguyên seal.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Link
          href="/orders"
          className="ts-cta py-2.5 px-5 text-xs font-bold inline-flex items-center gap-2"
        >
          <PackageCheck className="w-4 h-4" />
          <span>Theo Dõi Tiến Trình Đơn Hàng</span>
        </Link>

        <Link
          href="/catalog"
          className="py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition"
        >
          <span>Tiếp tục khám phá Laptop</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <BrandSectionBackground
      variant="soft-blue"
      pattern="dot"
      patternOpacity={0.05}
      withGlow={true}
      className="min-h-full p-6 sm:p-10"
    >
      <Suspense fallback={<div className="text-center text-xs text-slate-500 p-8">Đang tải biên nhận đơn hàng...</div>}>
        <OrderReceiptContent />
      </Suspense>
    </BrandSectionBackground>
  );
}
