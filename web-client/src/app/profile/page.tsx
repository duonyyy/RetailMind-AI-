'use client';

import React, { useState } from 'react';
import { BrandSectionBackground } from '@/components/patterns';
import {
  UserCheck,
  ShieldCheck,
  Download,
  Trash2,
  MapPin,
  Lock,
  CheckCircle2,
} from 'lucide-react';

export default function ProfilePrivacyPage() {
  const [exportedJson, setExportedJson] = useState<string | null>(null);
  const [deleteRequested, setDeleteRequested] = useState(false);

  const userProfile = {
    id: 'CUST-883',
    fullName: 'Trần Khách Hàng',
    emailMasked: 'tran.kh***@mwg-retailmind.vn',
    phoneMasked: '0908***883',
    cccdMasked: '0790******12 (Đã làm sạch PII)',
    role: 'CUSTOMER',
    addresses: [
      { label: 'Mặc định (Nhà riêng)', address: '136 Nguyễn Thái Học, Phường Phạm Ngũ Lão, Quận 1, TP.HCM' },
      { label: 'Văn phòng công ty', address: 'Tòa nhà MWG, Khu Công Nghệ Cao, TP. Thủ Đức, TP.HCM' },
    ],
  };

  const handleExportData = () => {
    const portableData = {
      compliance: 'Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 & Nghị định 13/2023/NĐ-CP',
      exportedAt: new Date().toISOString(),
      subject: userProfile,
      redactionPolicy: 'CCCD -> [REDACTED_CCCD], Phone -> [REDACTED_PHONE], Email -> [REDACTED_EMAIL]',
    };
    setExportedJson(JSON.stringify(portableData, null, 2));
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
          <UserCheck className="w-5 h-5 text-blue-600" />
          <span>Hồ Sơ Khách Hàng &amp; Trung Tâm Quyền Riêng Tư PII (SCR-13 • UC11)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Tuân thủ nghiêm ngặt Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 13/2023/NĐ-CP. Toàn bộ CCCD/SĐT đều được làm sạch trước khi gửi tới LLM.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Personal Info & Masked PII */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>Thông Tin Định Danh Đã Che Giấu (PII Masked)</span>
            </h2>
            <span className="ts-badge-success px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              Chống IDOR Active
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Mã định danh khách hàng:</span>
              <span className="font-mono font-bold text-blue-600">{userProfile.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Họ và tên:</span>
              <span className="font-bold text-slate-900">{userProfile.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Số điện thoại (Masked):</span>
              <span className="font-mono font-semibold text-slate-800">{userProfile.phoneMasked}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email (Masked):</span>
              <span className="font-mono font-semibold text-slate-800">{userProfile.emailMasked}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Căn cước công dân (CCCD):</span>
              <span className="font-mono font-semibold text-emerald-700">{userProfile.cccdMasked}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Sổ Địa Chỉ Giao Nhận:</span>
            </h3>
            {userProfile.addresses.map((addr, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div className="font-bold text-slate-900">{addr.label}</div>
                <div className="text-slate-600 mt-0.5">{addr.address}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Data Subject Rights (NĐ 13/2023 & Luật 91/2025) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Quyền Của Chủ Thể Dữ Liệu (Data Subject Rights)</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="font-bold text-slate-900">
                1. Quyền Di Chuyển &amp; Trích Xuất Dữ Liệu (Data Portability)
              </div>
              <p className="text-slate-600">
                Tải về toàn bộ hồ sơ cá nhân, lịch sử đơn hàng và nhật ký hội thoại đã làm sạch PII dưới định dạng chuẩn JSON.
              </p>
              <button
                type="button"
                onClick={handleExportData}
                className="ts-cta py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Về Toàn Bộ Dữ Liệu Cá Nhân (JSON)</span>
              </button>
            </div>

            {exportedJson && (
              <pre className="p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[10px] overflow-x-auto max-h-40">
                {exportedJson}
              </pre>
            )}

            <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-2">
              <div className="font-bold text-rose-900">
                2. Quyền Được Lãng Quên &amp; Xóa Dữ Liệu (Right to be Forgotten)
              </div>
              <p className="text-rose-800/80">
                Yêu cầu xóa vĩnh viễn thông tin định danh cá nhân khỏi bộ nhớ hội thoại và ẩn danh hóa lịch sử giao dịch theo Điều 16 Nghị định 13/2023/NĐ-CP.
              </p>
              {deleteRequested ? (
                <div className="ts-badge-success p-2.5 rounded-lg font-bold inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đã ghi nhận yêu cầu làm sạch PII (#PII-DEL-2026) vào hàng đợi kiểm toán!</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteRequested(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold inline-flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yêu Cầu Xóa Tài Khoản &amp; Làm Sạch PII</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </BrandSectionBackground>
  );
}

