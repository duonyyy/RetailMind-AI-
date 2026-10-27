"use client";

import React, { useState } from "react";
import { BrandSectionBackground } from "@/components/patterns";
import {
  Tag,
  Plus,
  CheckCircle2,
  Calendar,
  Percent,
  Sliders,
} from "lucide-react";

export default function AdminPromotionsPage() {
  const promotions = [
    {
      code: "MWG_VIP500",
      description: "Giảm trực tiếp 500.000 VNĐ cho đơn hàng Laptop trên 15 triệu",
      discountAmount: "500.000 ₫",
      minOrder: "15.000.000 ₫",
      startDate: "2026-10-01",
      endDate: "2026-11-30",
      usageCount: 142,
      maxUsage: 500,
      status: "ACTIVE",
    },
    {
      code: "BACK2SCHOOL",
      description: "Tặng balo chính hãng + Giảm 300.000 VNĐ cho học sinh sinh viên",
      discountAmount: "300.000 ₫",
      minOrder: "12.000.000 ₫",
      startDate: "2026-09-01",
      endDate: "2026-10-31",
      usageCount: 489,
      maxUsage: 500,
      status: "ACTIVE",
    },
  ];

  return (
    <BrandSectionBackground
      variant="soft-blue"
      pattern="dot"
      patternOpacity={0.05}
      withGlow={true}
      className="min-h-full p-6 sm:p-8 space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            Khuyến Mãi &amp; Quy Tắc Giá (UC10)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản trị mã giảm giá, chiết khấu và ràng buộc giá niêm yết duy nhất từ PostgreSQL SSOT.
          </p>
        </div>

        <button className="ts-cta text-xs py-2 px-4 inline-flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm Mã Khuyến Mãi Mới</span>
        </button>
      </div>

      <div className="space-y-4">
        {promotions.map((p) => (
          <div key={p.code} className="ts-feature-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-base font-extrabold text-blue-600 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                  {p.code}
                </span>
                <span className="ts-badge-success text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Đang Kích Hoạt
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Hiệu lực: {p.startDate} &rarr; {p.endDate}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Mô tả chương trình:</span>
                <p className="font-semibold text-slate-800">{p.description}</p>
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-slate-400">Mức giảm:</span>{" "}
                  <span className="font-bold text-blue-600 tabular-nums">{p.discountAmount}</span>
                </div>
                <div>
                  <span className="text-slate-400">Đơn hàng tối thiểu:</span>{" "}
                  <span className="font-semibold text-slate-800 tabular-nums">{p.minOrder}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Số lượt đã dùng:</span>
                <div className="font-bold text-slate-900 tabular-nums">
                  {p.usageCount} / {p.maxUsage} lượt
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${(p.usageCount / p.maxUsage) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </BrandSectionBackground>
  );
}
