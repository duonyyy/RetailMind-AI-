'use client';

import React, { useState } from 'react';
import { BrandSectionBackground } from '@/components/patterns';
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  Power,
  CheckCircle2,
} from 'lucide-react';

export default function AdminStoresPage() {
  const [stores, setStores] = useState([
    {
      storeId: 'store-hcm-q1',
      branchCode: 'MWG_HCM_001',
      name: 'Thế Giới Di Động 136 Nguyễn Thái Học',
      address: '136 Nguyễn Thái Học, Phường Phạm Ngũ Lão, Quận 1, TP.HCM',
      coordinates: '10.7689° N, 106.6951° E',
      phone: '1800 1060 (Nhánh 101)',
      hours: '07:30 - 22:00 (Cả tuần)',
      onlinePickupEnabled: true,
    },
    {
      storeId: 'store-hn-cg',
      branchCode: 'MWG_HN_002',
      name: 'Thế Giới Di Động 117 Thái Hà',
      address: '117 Thái Hà, Phường Trung Liệt, Quận Đống Đa, Hà Nội',
      coordinates: '21.0124° N, 105.8211° E',
      phone: '1800 1060 (Nhánh 202)',
      hours: '07:30 - 22:00 (Cả tuần)',
      onlinePickupEnabled: true,
    },
    {
      storeId: 'store-dn-hc',
      branchCode: 'MWG_DN_003',
      name: 'Điện Máy Xanh 320 Đường 2 Tháng 9',
      address: '320 Đường 2/9, Quận Hải Châu, TP. Đà Nẵng',
      coordinates: '16.0471° N, 108.2208° E',
      phone: '1800 1061 (Nhánh 305)',
      hours: '08:00 - 21:30 (Cả tuần)',
      onlinePickupEnabled: true,
    },
  ]);

  const togglePickup = (code: string) => {
    setStores((prev) =>
      prev.map((s) =>
        s.branchCode === code
          ? { ...s, onlinePickupEnabled: !s.onlinePickupEnabled }
          : s
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
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          <span>Quản Lý Chi Nhánh &amp; Điểm Bán Siêu Thị MWG (SCR-23 • UC06)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Quản trị mạng lưới điểm bán nhận giữ tồn kho trực tuyến, tọa độ định vị và giờ hoạt động phục vụ Checkout.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stores.map((st) => (
          <div key={st.branchCode} className="ts-feature-card p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-md">
                  {st.branchCode}
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    st.onlinePickupEnabled ? 'ts-badge-success' : 'ts-badge-warning'
                  }`}
                >
                  {st.onlinePickupEnabled ? 'Nhận Giữ Kho Online' : 'Tạm Bảo Trì'}
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900">{st.name}</h2>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>{st.address}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span>GPS: {st.coordinates}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{st.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{st.hours}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">ID: {st.storeId}</span>
              <button
                type="button"
                onClick={() => togglePickup(st.branchCode)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5"
              >
                <Power className="w-3.5 h-3.5 text-blue-600" />
                <span>{st.onlinePickupEnabled ? 'Tạm ngưng nhận đơn' : 'Bật nhận đơn'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </BrandSectionBackground>
  );
}

