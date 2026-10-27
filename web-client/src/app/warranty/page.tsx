'use client';

import React, { useState } from 'react';
import { BrandSectionBackground } from '@/components/patterns';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  RefreshCw,
  FileCheck2,
  Building2,
} from 'lucide-react';

export default function WarrantyPortalPage() {
  const [serialOrOrder, setSerialOrOrder] = useState('SN-ASUS-2026-998812');
  const [claimReason, setClaimReason] = useState('');
  const [claimStore, setClaimStore] = useState('MWG_HCM_001');
  const [claimSubmitted, setClaimSubmitted] = useState(false);

  const warrantyInfo = {
    serial: serialOrOrder || 'SN-ASUS-2026-998812',
    orderNo: 'MWG-20261026-9812',
    productName: 'Laptop Asus Vivobook 15 OLED A1505VA',
    sku: 'LT-ASUS-VIVO15-OLED',
    activatedAt: '2026-10-26',
    expiresAt: '2028-10-26 (24 tháng chính hãng)',
    daysLeftFor30DayReturn: 29,
    eligibleFor1To1Exchange: true,
  };

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimReason.trim()) return;
    setClaimSubmitted(true);
  };

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
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <span>Cổng Bảo Hành Điện Tử &amp; Đổi Trả 30 Ngày (SCR-11 • UC04/UC05)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Tra cứu hạn bảo hành chính hãng 24 tháng theo số Serial/IMEI và gửi yêu cầu đổi mới 1-1 miễn phí trong 30 ngày đầu.
        </p>
      </div>

      {/* Serial / Order Lookup Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={serialOrOrder}
            onChange={(e) => setSerialOrOrder(e.target.value)}
            placeholder="Nhập số Serial/IMEI máy hoặc Mã đơn hàng MWG..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button type="button" className="ts-cta text-xs py-2 px-4">
          Tra Cứu Bảo Hành
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Warranty Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Chứng Nhận Bảo Hành Điện Tử SSOT</h2>
            </div>
            <span className="ts-badge-success px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              Đang Hiệu Lực
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Thiết bị:</span>
              <span className="font-bold text-slate-900">{warrantyInfo.productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Số Serial / Service Tag:</span>
              <span className="font-mono font-bold text-blue-600">{warrantyInfo.serial}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Mã hóa đơn gốc:</span>
              <span className="font-mono font-semibold text-slate-800">{warrantyInfo.orderNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ngày kích hoạt bảo hành:</span>
              <span className="font-semibold text-slate-800">{warrantyInfo.activatedAt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Thời hạn bảo hành 24 tháng:</span>
              <span className="font-bold text-emerald-700">{warrantyInfo.expiresAt}</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between mt-2">
              <span className="font-bold text-blue-900">Quyền đổi mới 1-1 miễn phí 30 ngày:</span>
              <span className="font-extrabold text-blue-700 tabular-nums">
                Còn {warrantyInfo.daysLeftFor30DayReturn} ngày
              </span>
            </div>
          </div>
        </div>

        {/* Right: 30-Day Replacement Claim Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Đăng Ký Thẩm Định Đổi Máy Mới 1-1 Trong 30 Ngày
          </h2>

          {claimSubmitted ? (
            <div className="ts-badge-success p-5 rounded-xl text-center space-y-2 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <div className="font-bold text-sm">Đã tạo hồ sơ thẩm định đổi mới #WR-2026-301!</div>
              <p className="text-slate-600">
                Quý khách vui lòng mang máy kèm hộp tới siêu thị <strong>{claimStore}</strong> để nhận máy mới nguyên seal trong 30 phút.
              </p>
              <button
                type="button"
                onClick={() => {
                  setClaimSubmitted(false);
                  setClaimReason('');
                }}
                className="ts-cta py-2 px-4 text-xs mt-2"
              >
                Tạo yêu cầu khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleClaimSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Chọn Siêu Thị MWG Tiếp Nhận Đổi Máy:
                </label>
                <select
                  value={claimStore}
                  onChange={(e) => setClaimStore(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                >
                  <option value="MWG_HCM_001">136 Nguyễn Thái Học, Q.1, TP.HCM (MWG_HCM_001)</option>
                  <option value="MWG_HN_002">117 Thái Hà, Đống Đa, Hà Nội (MWG_HN_002)</option>
                  <option value="MWG_DN_003">320 đường 2/9, Hải Châu, Đà Nẵng (MWG_DN_003)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Mô tả biểu hiện lỗi kỹ thuật phần cứng:
                </label>
                <textarea
                  rows={3}
                  value={claimReason}
                  onChange={(e) => setClaimReason(e.target.value)}
                  placeholder="VD: Màn hình xuất hiện sọc sáng hoặc pin sụt nhanh bất thường..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button type="submit" className="ts-cta py-2.5 px-5 text-xs font-bold">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Gửi Yêu Cầu Đổi Mới 30 Ngày</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </BrandSectionBackground>
  );
}

