"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BrandSectionBackground } from "@/components/patterns";
import {
  Laptop,
  CheckCircle2,
  SlidersHorizontal,
  Building2,
  Search,
  ShoppingCart,
  Sparkles,
} from "lucide-react";

export default function CatalogPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("ALL");

  const laptops = [
    {
      sku: "LT-ASUS-VIVO15-OLED",
      name: "Laptop Asus Vivobook 15 OLED A1505VA",
      brand: "ASUS",
      price: "17.990.000 ₫",
      cpu: "Intel Core i5-13500H",
      ram: "16 GB DDR4",
      storage: "512 GB SSD",
      display: "15.6 inch OLED 2.8K 120Hz",
      stockTotal: 25,
      branches: [
        { name: "136 Nguyễn Thái Học, Q.1, TP.HCM", stock: 12 },
        { name: "117 Thái Hà, Đống Đa, Hà Nội", stock: 8 },
        { name: "320 đường 2/9, Hải Châu, Đà Nẵng", stock: 5 },
      ],
    },
    {
      sku: "LT-DELL-INSP14-5430",
      name: "Laptop Dell Inspiron 14 5430",
      brand: "DELL",
      price: "18.490.000 ₫",
      cpu: "Intel Core i5-1335U",
      ram: "16 GB LPDDR5",
      storage: "512 GB SSD",
      display: "14 inch FHD+ WVA",
      stockTotal: 18,
      branches: [
        { name: "136 Nguyễn Thái Học, Q.1, TP.HCM", stock: 8 },
        { name: "117 Thái Hà, Đống Đa, Hà Nội", stock: 6 },
        { name: "320 đường 2/9, Hải Châu, Đà Nẵng", stock: 4 },
      ],
    },
    {
      sku: "LT-LENOVO-TB14-G6",
      name: "Laptop Lenovo ThinkBook 14 G6+ (2024)",
      brand: "LENOVO",
      price: "19.990.000 ₫",
      cpu: "Intel Core Ultra 5 125H AI NPU",
      ram: "16 GB LPDDR5X",
      storage: "512 GB SSD",
      display: "14 inch 2.5K 90Hz 100% sRGB",
      stockTotal: 14,
      branches: [
        { name: "136 Nguyễn Thái Học, Q.1, TP.HCM", stock: 7 },
        { name: "117 Thái Hà, Đống Đa, Hà Nội", stock: 5 },
        { name: "320 đường 2/9, Hải Châu, Đà Nẵng", stock: 2 },
      ],
    },
    {
      sku: "LT-ACER-SWIFT-GO14",
      name: "Laptop Acer Swift Go 14 OLED SFG14",
      brand: "ACER",
      price: "16.990.000 ₫",
      cpu: "Intel Core i5-13500H",
      ram: "16 GB LPDDR5",
      storage: "512 GB SSD",
      display: "14 inch 2.8K OLED",
      stockTotal: 9,
      branches: [
        { name: "136 Nguyễn Thái Học, Q.1, TP.HCM", stock: 4 },
        { name: "117 Thái Hà, Đống Đa, Hà Nội", stock: 3 },
        { name: "320 đường 2/9, Hải Châu, Đà Nẵng", stock: 2 },
      ],
    },
  ];

  const filtered = laptops.filter((item) => {
    if (selectedBrand !== "ALL" && item.brand !== selectedBrand) return false;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Danh Mục Laptop MWG (UC02)
            </h1>
            <span className="ts-badge-success text-xs px-2.5 py-0.5 rounded-full font-bold">
              SSOT Chân Lý Tồn Kho
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dữ liệu kỹ thuật, giá niêm yết và số lượng sẵn sàng tại các chi nhánh được đồng bộ trực tiếp từ PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            className="ts-cta text-xs py-2 px-3.5 inline-flex items-center gap-1.5"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Xem Giỏ Hàng</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Hãng:</span>
          {["ALL", "ASUS", "DELL", "LENOVO", "ACER"].map((b) => (
            <button
              key={b}
              onClick={() => setSelectedBrand(b)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedBrand === b
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900"
              }`}
            >
              {b}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên máy, SKU..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Grid of Laptops */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((item) => (
          <div
            key={item.sku}
            className="ts-feature-card p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-md font-bold">
                  {item.brand}
                </span>
                <span className="ts-badge-success text-xs px-2.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Tổng tồn: {item.stockTotal} chiếc
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900 mb-1">{item.name}</h2>
              <p className="text-xs font-mono text-slate-400 mb-4">SKU: {item.sku}</p>

              {/* Hardware specifications */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80 mb-4">
                <div>
                  <span className="text-slate-400 block">CPU:</span>
                  <span className="font-semibold text-slate-800">{item.cpu}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Bộ nhớ:</span>
                  <span className="font-bold text-blue-600">{item.ram}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Ổ cứng:</span>
                  <span className="font-medium text-slate-700">{item.storage}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Màn hình:</span>
                  <span className="font-medium text-slate-700">{item.display}</span>
                </div>
              </div>

              {/* Branch stock distribution */}
              <div className="mb-4">
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                  Phân bổ tồn kho tại chi nhánh:
                </span>
                <div className="space-y-1">
                  {item.branches.map((br, bIdx) => (
                    <div
                      key={bIdx}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-100/60"
                    >
                      <span className="text-slate-600 truncate max-w-[260px]">{br.name}</span>
                      <span className="font-bold text-emerald-700">{br.stock} máy</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">
                  Giá niêm yết (SSOT)
                </span>
                <span className="text-lg font-extrabold text-blue-600 tabular-nums">
                  {item.price}
                </span>
              </div>
              <Link
                href={`/?sku=${item.sku}#checkout`}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs"
              >
                Đặt Mua Ngay
              </Link>
            </div>
          </div>
        ))}
      </div>
    </BrandSectionBackground>
  );
}
