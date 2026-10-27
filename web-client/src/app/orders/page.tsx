'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BrandSectionBackground } from '@/components/patterns';
import {
  PackageCheck,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldCheck,
} from 'lucide-react';

interface OrderRecord {
  orderNo: string;
  productName: string;
  sku: string;
  branch: string;
  totalAmount: string;
  status: 'PLACED' | 'CONFIRMED' | 'PACKING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';
  stepIndex: number; // 1 to 5
  orderDate: string;
  warrantyUntil: string;
  returnEligibleUntil: string;
}

const ORDER_STEPS = [
  '1. Đã đặt hàng',
  '2. Đã xác nhận & Giữ kho',
  '3. Đang đóng gói',
  '4. Đang giao hàng',
  '5. Hoàn tất',
];

export default function OrdersPage() {
  const [orderQuery, setOrderQuery] = useState('');
  const [statusTab, setStatusTab] = useState('ALL');
  const [orders, setOrders] = useState<OrderRecord[]>([
    {
      orderNo: 'MWG-20261026-9812',
      productName: 'Laptop Asus Vivobook 15 OLED A1505VA',
      sku: 'LT-ASUS-VIVO15-OLED',
      branch: '136 Nguyễn Thái Học, Q.1, TP.HCM',
      totalAmount: '19.239.000 ₫',
      status: 'COMPLETED',
      stepIndex: 5,
      orderDate: '2026-10-26 14:30',
      warrantyUntil: '2028-10-26',
      returnEligibleUntil: '2026-11-25 (Còn 30 ngày)',
    },
    {
      orderNo: 'MWG-20261027-4102',
      productName: 'Laptop Lenovo ThinkBook 14 G6+ (2024 AI PC)',
      sku: 'LT-LENOVO-TB14-G6',
      branch: '117 Thái Hà, Đống Đa, Hà Nội',
      totalAmount: '21.439.000 ₫',
      status: 'CONFIRMED',
      stepIndex: 2,
      orderDate: '2026-10-27 09:15',
      warrantyUntil: '2028-10-27',
      returnEligibleUntil: '2026-11-26 (Còn 30 ngày)',
    },
  ]);

  const handleCancelOrder = (orderNo: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.orderNo === orderNo ? { ...o, status: 'CANCELLED', stepIndex: 0 } : o
      )
    );
  };

  const filtered = orders.filter((o) => {
    if (statusTab !== 'ALL' && o.status !== statusTab) return false;
    if (
      orderQuery &&
      !o.orderNo.toLowerCase().includes(orderQuery.toLowerCase()) &&
      !o.productName.toLowerCase().includes(orderQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

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
            <PackageCheck className="w-5 h-5 text-blue-600" />
            <span>Lịch Sử Đơn Hàng &amp; Theo Dõi Vận Chuyển 5 Bước (SCR-10 • UC04)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi hành trình đơn hàng cá nhân (Chống IDOR), tải hóa đơn VAT điện tử hoặc hủy đơn hoàn trả tồn kho tự động.
          </p>
        </div>

        <Link
          href="/warranty"
          className="px-3.5 py-2 rounded-xl bg-white border border-blue-200 text-blue-700 text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Mở Cổng Bảo Hành 30 Ngày (SCR-11)</span>
        </Link>
      </div>

      {/* Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap text-xs font-semibold">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'CONFIRMED', label: 'Đã giữ kho' },
              { id: 'SHIPPING', label: 'Đang giao' },
              { id: 'COMPLETED', label: 'Hoàn tất' },
              { id: 'CANCELLED', label: 'Đã hủy' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setStatusTab(t.id)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusTab === t.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              placeholder="Tìm theo mã đơn MWG-YYYYMMDD-XXXX..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Orders List with 5-Step Stepper */}
      <div className="space-y-4">
        {filtered.map((ord) => (
          <div key={ord.orderNo} className="ts-feature-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-blue-600">
                  {ord.orderNo}
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    ord.status === 'COMPLETED'
                      ? 'ts-badge-success'
                      : ord.status === 'CANCELLED'
                      ? 'ts-badge-danger'
                      : 'ts-badge-warning'
                  }`}
                >
                  {ord.status === 'COMPLETED'
                    ? 'Đã Giao Thành Công'
                    : ord.status === 'CANCELLED'
                    ? 'Đã Hủy & Hoàn Kho'
                    : 'Đã Xác Nhận & Giữ Tồn Kho'}
                </span>
              </div>
              <span className="text-xs text-slate-400">Ngày đặt: {ord.orderDate}</span>
            </div>

            {/* 5-Step Order Stepper */}
            {ord.status !== 'CANCELLED' && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 py-2">
                {ORDER_STEPS.map((stepLabel, idx) => {
                  const done = idx + 1 <= ord.stepIndex;
                  return (
                    <div
                      key={stepLabel}
                      className={`p-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 ${
                        done
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          done ? 'text-emerald-600' : 'text-slate-300'
                        }`}
                      />
                      <span className="truncate">{stepLabel}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Sản phẩm (Snapshot giá lúc mua):</span>
                <Link
                  href={`/products/${ord.sku}`}
                  className="font-bold text-slate-900 hover:text-blue-600 text-sm block"
                >
                  {ord.productName}
                </Link>
                <span className="text-slate-400 font-mono text-[11px]">SKU: {ord.sku}</span>
                <div className="mt-2 text-slate-600">
                  <span className="font-semibold">Chi nhánh phụ trách:</span> {ord.branch}
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng thanh toán:</span>
                  <span className="font-extrabold text-blue-600 tabular-nums">{ord.totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hạn bảo hành chính hãng:</span>
                  <span className="font-semibold text-emerald-700">{ord.warrantyUntil}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Đổi trả miễn phí 30 ngày:</span>
                  <span className="font-bold text-blue-700">{ord.returnEligibleUntil}</span>
                </div>
              </div>
            </div>

            {/* Order Action Footer */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5 text-xs">
              <Link
                href={`/warranty?orderNo=${ord.orderNo}`}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-semibold text-slate-700 inline-flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Hóa đơn VAT &amp; Bảo hành</span>
              </Link>

              {ord.status === 'CONFIRMED' && (
                <button
                  type="button"
                  onClick={() => handleCancelOrder(ord.orderNo)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold inline-flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Hủy đơn &amp; Hoàn kho</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </BrandSectionBackground>
  );
}
