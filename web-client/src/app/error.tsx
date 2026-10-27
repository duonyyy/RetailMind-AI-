'use client';

import React from 'react';
import Link from 'next/link';
import { BrandSectionBackground } from '@/components/patterns';
import { BASELINE_LAPTOP_CATALOG } from '@/features/catalog/services/catalog.get';
import { ShieldCheck, RefreshCw, Laptop } from 'lucide-react';

/**
 * SCR-26: Graceful Degradation Error Boundary (`error.tsx` per SCREEN_SPECIFICATIONS.md Section 4)
 * Guarantees Zero-500 crash experience with Offline Baseline Catalog fallback.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <BrandSectionBackground
      variant="soft-blue"
      pattern="dot"
      patternOpacity={0.05}
      withGlow={true}
      className="min-h-full p-6 sm:p-10 space-y-6"
    >
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-7 shadow-lg space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <span className="ts-badge-warning px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              SCR-26 • Chế Độ Tự Phục Hồi An Toàn (Graceful Degradation)
            </span>
            <h1 className="text-lg font-extrabold text-slate-900">
              Hệ thống đang tự động kích hoạt chế độ phục hồi an toàn
            </h1>
            <p className="text-xs text-slate-500">
              {error?.message ||
                'Kết nối tạm thời gián đoạn. Danh mục Laptop dự phòng chuẩn SSOT đã được nạp sẵn để không làm gián đoạn trải nghiệm của quý khách.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => reset()}
            className="ts-cta py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử Tải Lại</span>
          </button>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Danh Mục Laptop Lưu Trữ Ngoại Tuyến (Offline Baseline Catalog):</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BASELINE_LAPTOP_CATALOG.slice(0, 4).map((item) => (
              <div
                key={item.sku}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{item.name}</div>
                  <div className="text-blue-600 font-extrabold tabular-nums mt-0.5">
                    {item.formattedPrice}
                  </div>
                </div>
                <Link
                  href={`/products/${item.sku}`}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:text-blue-600"
                >
                  Xem
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrandSectionBackground>
  );
}

