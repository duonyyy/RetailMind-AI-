'use client';

import React, { useState } from 'react';
import { BrandSectionBackground } from '@/components/patterns';
import { formatVND } from '@/lib/utils';
import {
  Tag,
  Plus,
  CheckCircle2,
  Power,
} from 'lucide-react';

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState([
    {
      code: 'MWG_VIP500',
      description: 'Giảm trực tiếp 500.000 VNĐ cho đơn hàng Laptop trên 15 triệu',
      discountAmount: '500.000 ₫',
      minOrder: '15.000.000 ₫',
      startDate: '2026-10-01',
      endDate: '2026-11-30',
      usageCount: 142,
      maxUsage: 500,
      status: 'ACTIVE',
    },
    {
      code: 'BACK2SCHOOL',
      description: 'Tặng balo chính hãng + Giảm 300.000 VNĐ cho học sinh sinh viên',
      discountAmount: '300.000 ₫',
      minOrder: '12.000.000 ₫',
      startDate: '2026-09-01',
      endDate: '2026-10-31',
      usageCount: 489,
      maxUsage: 500,
      status: 'ACTIVE',
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [desc, setDesc] = useState('');
  const [discountVnd, setDiscountVnd] = useState('400000');
  const [minOrderVnd, setMinOrderVnd] = useState('16000000');
  const [maxUsage, setMaxUsage] = useState(300);

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !desc.trim()) return;
    setPromotions((prev) => [
      {
        code: code.toUpperCase().trim(),
        description: desc.trim(),
        discountAmount: formatVND(discountVnd),
        minOrder: formatVND(minOrderVnd),
        startDate: '2026-10-27',
        endDate: '2026-12-31',
        usageCount: 0,
        maxUsage,
        status: 'ACTIVE',
      },
      ...prev,
    ]);
    setShowModal(false);
    setCode('');
    setDesc('');
  };

  const toggleStatus = (targetCode: string) => {
    setPromotions((prev) =>
      prev.map((p) =>
        p.code === targetCode
          ? { ...p, status: p.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }
          : p
      )
    );
  };

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
            <span>Cấu Hình Khuyến Mãi &amp; Quy Tắc Giá SSOT (SCR-20 • UC07/UC10)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản trị mã voucher giảm giá, chặn âm giá và đối soát trần ngân sách khuyến mãi tại PostgreSQL SSOT.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(!showModal)}
          className="ts-cta text-xs py-2 px-4 inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm Mã Khuyến Mãi Mới</span>
        </button>
      </div>

      {showModal && (
        <form
          onSubmit={handleCreatePromo}
          className="bg-white rounded-2xl border border-blue-200 p-6 shadow-md space-y-4 text-xs"
        >
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            Tạo Mã Voucher Mới (SSOT Price Rule)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mã Voucher:</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: MWG_TET2026"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mức giảm cố định (VNĐ):</label>
              <input
                type="text"
                value={discountVnd}
                onChange={(e) => setDiscountVnd(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-blue-600 tabular-nums"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Đơn hàng tối thiểu (VNĐ):</label>
              <input
                type="text"
                value={minOrderVnd}
                onChange={(e) => setMinOrderVnd(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 tabular-nums"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Giới hạn tổng lượt dùng:</label>
              <input
                type="number"
                value={maxUsage}
                onChange={(e) => setMaxUsage(Number(e.target.value))}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 tabular-nums"
              />
            </div>
            <div className="md:col-span-4">
              <label className="font-bold text-slate-700 block mb-1">Mô tả điều kiện áp dụng:</label>
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="VD: Giảm trực tiếp 400.000 VNĐ cho đơn hàng Laptop từ 16 triệu..."
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
            >
              Hủy
            </button>
            <button type="submit" className="ts-cta py-2 px-5 font-bold">
              Kích Hoạt Mã Khuyến Mãi
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {promotions.map((p) => (
          <div key={p.code} className="ts-feature-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-base font-extrabold text-blue-600 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                  {p.code}
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    p.status === 'ACTIVE' ? 'ts-badge-success' : 'ts-badge-warning'
                  }`}
                >
                  {p.status === 'ACTIVE' ? 'Đang Kích Hoạt' : 'Đang Tạm Dừng'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  Hiệu lực: {p.startDate} &rarr; {p.endDate}
                </span>
                <button
                  type="button"
                  onClick={() => toggleStatus(p.code)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1"
                >
                  <Power className="w-3 h-3" />
                  <span>{p.status === 'ACTIVE' ? 'Tạm dừng' : 'Kích hoạt'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Mô tả chương trình:</span>
                <p className="font-semibold text-slate-800">{p.description}</p>
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-slate-400">Mức giảm:</span>{' '}
                  <span className="font-bold text-blue-600 tabular-nums">{p.discountAmount}</span>
                </div>
                <div>
                  <span className="text-slate-400">Đơn hàng tối thiểu:</span>{' '}
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
                    style={{ width: `${Math.min(100, (p.usageCount / p.maxUsage) * 100)}%` }}
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
