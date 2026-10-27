"use client";

import React, { useState } from "react";
import { BrandSectionBackground } from "@/components/patterns";
import {
  Warehouse,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building2,
  Layers,
  ArrowUpDown,
} from "lucide-react";

export default function AdminInventoryPage() {
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const inventory = [
    {
      sku: "LT-ASUS-VIVO15-OLED",
      name: "Laptop Asus Vivobook 15 OLED",
      branchCode: "MWG_HCM_001",
      branchName: "136 Nguyễn Thái Học, Q.1, TP.HCM",
      physicalQty: 15,
      reservedQty: 3,
      availableQty: 12,
      safetyThreshold: 5,
    },
    {
      sku: "LT-ASUS-VIVO15-OLED",
      name: "Laptop Asus Vivobook 15 OLED",
      branchCode: "MWG_HN_002",
      branchName: "117 Thái Hà, Đống Đa, Hà Nội",
      physicalQty: 10,
      reservedQty: 2,
      availableQty: 8,
      safetyThreshold: 5,
    },
    {
      sku: "LT-DELL-INSP14-5430",
      name: "Laptop Dell Inspiron 14 5430",
      branchCode: "MWG_HCM_001",
      branchName: "136 Nguyễn Thái Học, Q.1, TP.HCM",
      physicalQty: 10,
      reservedQty: 2,
      availableQty: 8,
      safetyThreshold: 4,
    },
    {
      sku: "LT-LENOVO-TB14-G6",
      name: "Laptop Lenovo ThinkBook 14 G6+",
      branchCode: "MWG_DN_003",
      branchName: "320 đường 2/9, Hải Châu, Đà Nẵng",
      physicalQty: 3,
      reservedQty: 1,
      availableQty: 2,
      safetyThreshold: 3,
    },
  ];

  const filtered = inventory.filter((item) => {
    if (selectedBranch !== "ALL" && item.branchCode !== selectedBranch) return false;
    if (
      searchTerm &&
      !item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false;
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
            <Warehouse className="w-5 h-5 text-blue-600" />
            Quản Lý Tồn Kho Đa Chi Nhánh (UC06)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đồng bộ thời gian thực giữa tồn kho vật lý (Physical) và tồn kho khả dụng (Available). Khóa bi quan phòng chống Overselling.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Chi nhánh:</span>
          {["ALL", "MWG_HCM_001", "MWG_HN_002", "MWG_DN_003"].map((code) => (
            <button
              key={code}
              onClick={() => setSelectedBranch(code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedBranch === code
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900"
              }`}
            >
              {code}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo SKU, tên laptop..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Sản Phẩm &amp; SKU</th>
                <th className="py-3 px-4">Chi Nhánh Siêu Thị</th>
                <th className="py-3 px-4 text-center">Tồn Vật Lý</th>
                <th className="py-3 px-4 text-center">Đang Tạm Giữ</th>
                <th className="py-3 px-4 text-center">Tồn Khả Dụng</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((row, idx) => {
                const isLowStock = row.availableQty <= row.safetyThreshold;
                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{row.name}</div>
                      <div className="font-mono text-slate-400 text-[11px]">{row.sku}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{row.branchCode}</div>
                      <div className="text-[11px] text-slate-500">{row.branchName}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900 tabular-nums">
                      {row.physicalQty}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-600 tabular-nums">
                      {row.reservedQty}
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-blue-600 text-sm tabular-nums">
                      {row.availableQty}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isLowStock ? "ts-badge-warning" : "ts-badge-success"
                        }`}
                      >
                        {isLowStock ? "Sắp hết hàng" : "Đủ tồn kho"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </BrandSectionBackground>
  );
}
