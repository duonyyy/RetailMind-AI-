"use client";

import React, { useState } from "react";
import { BrandSectionBackground } from "@/components/patterns";
import {
  PackageCheck,
  Search,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export default function OrdersPage() {
  const [orderQuery, setOrderQuery] = useState("");

  const demoOrders = [
    {
      orderNo: "MWG-20261026-9812",
      productName: "Laptop Asus Vivobook 15 OLED A1505VA",
      sku: "LT-ASUS-VIVO15-OLED",
      branch: "136 Nguyễn Thái Học, Q.1, TP.HCM",
      totalAmount: "19.239.000 ₫",
      status: "COMPLETED",
      orderDate: "2026-10-26 14:30",
      warrantyUntil: "2028-10-26",
      returnEligibleUntil: "2026-11-25 (Còn 30 ngày)",
    },
    {
      orderNo: "MWG-20261024-4102",
      productName: "Laptop Lenovo ThinkBook 14 G6+",
      sku: "LT-LENOVO-TB14-G6",
      branch: "117 Thái Hà, Đống Đa, Hà Nội",
      totalAmount: "21.439.000 ₫",
      status: "SHIPPING",
      orderDate: "2026-10-24 09:15",
      warrantyUntil: "2028-10-24",
      returnEligibleUntil: "2026-11-23 (Còn 28 ngày)",
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
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <PackageCheck className="w-5 h-5 text-blue-600" />
          Tra Cứu Đơn Hàng &amp; Bảo Hành MWG (UC04)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Xem trạng thái giao hàng, thời hạn bảo hành 24 tháng chính hãng và quyền đổi trả miễn phí trong 30 ngày đầu.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={orderQuery}
            onChange={(e) => setOrderQuery(e.target.value)}
            placeholder="Nhập mã đơn hàng (VD: MWG-20261026-9812) hoặc Số điện thoại mua hàng..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button className="ts-cta text-xs py-2 px-4">
          Tìm Kiếm
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {demoOrders.map((ord) => (
          <div key={ord.orderNo} className="ts-feature-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-blue-600">
                  {ord.orderNo}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    ord.status === "COMPLETED"
                      ? "ts-badge-success"
                      : "ts-badge-warning"
                  }`}
                >
                  {ord.status === "COMPLETED" ? "Đã Giao Thành Công" : "Đang Vận Chuyển"}
                </span>
              </div>
              <span className="text-xs text-slate-400">Ngày đặt: {ord.orderDate}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Sản phẩm:</span>
                <span className="font-bold text-slate-900 text-sm block">{ord.productName}</span>
                <span className="text-slate-400 font-mono text-[11px]">SKU: {ord.sku}</span>
                <div className="mt-2 text-slate-600">
                  <span className="font-semibold">Chi nhánh giao:</span> {ord.branch}
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng thanh toán:</span>
                  <span className="font-bold text-blue-600 tabular-nums">{ord.totalAmount}</span>
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
          </div>
        ))}
      </div>
    </BrandSectionBackground>
  );
}
