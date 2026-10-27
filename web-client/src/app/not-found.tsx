import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BrandSectionBackground } from '@/components/patterns';
import { ArrowLeft, MessageSquareText, Laptop } from 'lucide-react';

/**
 * SCR-25: Custom 404 Not Found Page (`not-found.tsx` per SCREEN_SPECIFICATIONS.md Section 4)
 */
export default function NotFound() {
  return (
    <BrandSectionBackground
      variant="soft-blue"
      pattern="dot"
      patternOpacity={0.06}
      withGlow={true}
      className="min-h-full p-6 sm:p-12 flex items-center justify-center"
    >
      <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-xl text-center space-y-5">
        <div className="relative w-20 h-20 mx-auto">
          <Image
            src="/brand/icons-3d/icon-cube.png"
            alt="404 Not Found"
            fill
            className="object-contain"
          />
        </div>

        <div className="space-y-1.5">
          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
            SCR-25 • HTTP 404 NOT FOUND
          </span>
          <h1 className="text-xl font-extrabold text-slate-900">
            Rất tiếc, trang bạn tìm kiếm không tồn tại
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Đường dẫn truy cập có thể đã thay đổi hoặc mẫu laptop này đã ngừng kinh doanh. Bạn có thể quay về Trang chủ hoặc nhờ Trợ lý AI tìm mẫu tương đương.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="ts-cta py-2.5 px-5 text-xs font-bold inline-flex items-center gap-2"
          >
            <MessageSquareText className="w-4 h-4" />
            <span>Hỏi Trợ Lý AI Tư Vấn</span>
          </Link>
          <Link
            href="/catalog"
            className="py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Laptop className="w-4 h-4 text-blue-600" />
            <span>Xem Danh Mục Laptop</span>
          </Link>
        </div>
      </div>
    </BrandSectionBackground>
  );
}

