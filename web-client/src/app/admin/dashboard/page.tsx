'use client';

import React from 'react';
import Link from 'next/link';
import { BrandSectionBackground } from '@/components/patterns';
import {
  LayoutDashboard,
  TrendingUp,
  ShoppingBag,
  Cpu,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Database,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const kpis = [
    {
      label: 'Doanh Thu Hôm Nay (VNĐ)',
      value: '142.500.000 ₫',
      sub: '+12.4% so với hôm qua (PostgreSQL SSOT)',
      color: 'text-blue-600',
    },
    {
      label: 'Đơn Hàng Mới Toàn Sàn',
      value: '18 đơn',
      sub: '3 đơn đang khóa bi quan chờ nhận tại Q1',
      color: 'text-emerald-600',
    },
    {
      label: 'Chi Phí Token AI (FinOps)',
      value: '$0.0345 USD',
      sub: 'DuckDB FinOps Ledger • L1 Cache Hit 68%',
      color: 'text-amber-600',
    },
    {
      label: 'Tỷ Lệ Trả Lời Đúng (Grounding)',
      value: '99.4%',
      sub: 'Two-Way Citation Guard • Zero Hallucination',
      color: 'text-blue-700',
    },
  ];

  const recentOrders = [
    {
      orderNo: 'MWG-20261027-9812',
      customer: 'Trần Minh Đức',
      product: 'Asus Vivobook 15 OLED A1505VA',
      store: 'MWG_HCM_001',
      total: '19.239.000 ₫',
      status: 'CONFIRMED',
    },
    {
      orderNo: 'MWG-20261027-9811',
      customer: 'Lê Thu Hà',
      product: 'Lenovo ThinkBook 14 G6+ AI PC',
      store: 'MWG_HN_002',
      total: '21.439.000 ₫',
      status: 'SHIPPING',
    },
    {
      orderNo: 'MWG-20261027-9809',
      customer: 'Phạm Quốc Bảo',
      product: 'MacBook Air 13.6" M2 (16GB)',
      store: 'MWG_HCM_001',
      total: '29.139.000 ₫',
      status: 'COMPLETED',
    },
  ];

  const topProducts = [
    { sku: 'LT-ASUS-VIVO15-OLED', name: 'Asus Vivobook 15 OLED A1505VA', sold: 8, share: 88 },
    { sku: 'LT-LENOVO-TB14-G6', name: 'Lenovo ThinkBook 14 G6+ AI PC', sold: 5, share: 65 },
    { sku: 'LT-DELL-INSP14-5430', name: 'Dell Inspiron 14 5430', sold: 3, share: 45 },
    { sku: 'LT-APPLE-MBA-M2-16GB', name: 'MacBook Air M2 16GB', sold: 2, share: 32 },
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
            <LayoutDashboard className="w-5 h-5 text-blue-600" />
            <span>Bảng Điều Khiển Tổng Quan &amp; Chỉ Số FinOps (SCR-14 • UC06/UC09)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Giám sát thời gian thực doanh số bán lẻ chuỗi siêu thị MWG, hiệu suất chuyển đổi AI Advisor và sổ cái chi phí Token.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/hitl"
            className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>1 Tác Vụ HITL Chờ Duyệt</span>
          </Link>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-xs font-bold text-slate-400 block">{k.label}</span>
            <span className={`text-2xl font-extrabold tabular-nums block ${k.color}`}>{k.value}</span>
            <span className="text-[11px] text-slate-500 block pt-1">{k.sub}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Real-time Order Activity */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <span>Hoạt Động Đơn Hàng &amp; Khóa Kho Thời Gian Thực</span>
            </h2>
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              <span>Quản lý OMS</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="py-3 px-4">Mã Đơn</th>
                  <th className="py-3 px-4">Khách Hàng</th>
                  <th className="py-3 px-4">Sản Phẩm</th>
                  <th className="py-3 px-4">Tổng Tiền</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentOrders.map((ord) => (
                  <tr key={ord.orderNo} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{ord.orderNo}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{ord.customer}</td>
                    <td className="py-3.5 px-4 text-slate-600">{ord.product}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 tabular-nums">{ord.total}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.status === 'COMPLETED' ? 'ts-badge-success' : 'ts-badge-warning'
                        }`}
                      >
                        {ord.status === 'CONFIRMED'
                          ? 'Đã Giữ Kho'
                          : ord.status === 'SHIPPING'
                          ? 'Đang Giao'
                          : 'Hoàn Tất'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 5 Cols: Top Selling Laptops */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Top Laptop Bán Chạy Trong Ngày</span>
            </h2>
            <Link href="/admin/products" className="text-xs font-bold text-blue-600 hover:underline">
              Mở PIM Hub
            </Link>
          </div>

          <div className="space-y-3.5 text-xs">
            {topProducts.map((tp) => (
              <div key={tp.sku} className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-800">{tp.name}</span>
                  <span className="font-mono font-bold text-blue-600 tabular-nums">
                    {tp.sold} máy
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 h-full rounded-full"
                    style={{ width: `${tp.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrandSectionBackground>
  );
}
