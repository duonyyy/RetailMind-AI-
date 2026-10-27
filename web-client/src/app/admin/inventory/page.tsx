'use client';

import React, { useState } from 'react';
import { BrandSectionBackground } from '@/components/patterns';
import { INITIAL_BRANCH_INVENTORY } from '@/features/admin-inventory/services/inventory.get';
import {
  Warehouse,
  Search,
  PlusCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export default function AdminInventoryPage() {
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [inventory, setInventory] = useState(INITIAL_BRANCH_INVENTORY);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [deltaQty, setDeltaQty] = useState<number>(5);
  const [adjustReason, setAdjustReason] = useState('Nhập bổ sung lô hàng mới từ kho tổng MWG');
  const [auditToast, setAuditToast] = useState<string | null>(null);

  const handleApplyAdjust = (id: string) => {
    setInventory((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const newPhysical = Math.max(row.reservedQty, row.physicalQty + deltaQty);
        return {
          ...row,
          physicalQty: newPhysical,
          availableQty: newPhysical - row.reservedQty,
          lastUpdated: 'Vừa xong',
        };
      })
    );
    setAdjustingId(null);
    setAuditToast(
      `Đã cập nhật tồn kho và ghi Sổ cái SHA-256 (Lý do: "${adjustReason}")`
    );
  };

  const filtered = inventory.filter((item) => {
    if (selectedBranch !== 'ALL' && item.branchCode !== selectedBranch) return false;
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
            <span>Ma Trận Tồn Kho Đa Chi Nhánh (SCR-16 • UC06/UC09)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kiểm soát tồn vật lý, số lượng tạm giữ (<code className="font-mono">SELECT ... FOR UPDATE</code>) và điều chỉnh kiểm kê có lưu vết kiểm toán bắt buộc.
          </p>
        </div>
      </div>

      {auditToast && (
        <div className="ts-badge-success p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{auditToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setAuditToast(null)}
            className="text-[11px] underline font-bold"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700">Chi nhánh:</span>
          {['ALL', 'MWG_HCM_001', 'MWG_HN_002', 'MWG_DN_003'].map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setSelectedBranch(code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedBranch === code
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
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
                <th className="py-3 px-4 text-center">Đang Giữ Chỗ</th>
                <th className="py-3 px-4 text-center">Tồn Khả Dụng</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Kiểm Kê Kho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((row) => {
                const isOut = row.availableQty <= 0;
                const isLowStock = !isOut && row.availableQty <= row.safetyThreshold;
                return (
                  <React.Fragment key={row.id}>
                    <tr className="hover:bg-slate-50/80 transition">
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
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            isOut
                              ? 'ts-badge-danger'
                              : isLowStock
                              ? 'ts-badge-warning'
                              : 'ts-badge-success'
                          }`}
                        >
                          {isOut ? 'Hết hàng' : isLowStock ? 'Sắp hết hàng' : 'Đủ tồn kho'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setAdjustingId(adjustingId === row.id ? null : row.id)
                          }
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold inline-flex items-center gap-1"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Điều chỉnh</span>
                        </button>
                      </td>
                    </tr>

                    {adjustingId === row.id && (
                      <tr className="bg-blue-50/40">
                        <td colSpan={7} className="p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <label className="font-bold text-slate-700">
                                Số lượng cộng/trừ:
                              </label>
                              <input
                                type="number"
                                value={deltaQty}
                                onChange={(e) => setDeltaQty(Number(e.target.value))}
                                className="w-24 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold tabular-nums"
                              />
                              <input
                                type="text"
                                value={adjustReason}
                                onChange={(e) => setAdjustReason(e.target.value)}
                                placeholder="Lý do kiểm kê bắt buộc ghi Audit Log..."
                                className="w-80 bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleApplyAdjust(row.id)}
                                className="ts-cta py-1.5 px-4 text-xs font-bold"
                              >
                                Xác Nhận &amp; Ghi Audit SHA-256
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </BrandSectionBackground>
  );
}
