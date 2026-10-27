"use client";

import React, { useState } from "react";
import { BrandSectionBackground } from "@/components/patterns";
import {
  FileSpreadsheet,
  ShieldCheck,
  Lock,
  Search,
  CheckCircle2,
  Key,
  Users,
  Database,
} from "lucide-react";

export default function AdminAuditLogsPage() {
  const [activeTab, setActiveTab] = useState<"logs" | "rbac">("logs");

  const auditLogs = [
    {
      id: "log-10294",
      timestamp: "2026-10-26 15:45:12",
      actor: "admin:ADM01 (Nguyễn Quản Trị)",
      action: "APPROVE_HITL_REFUND",
      target: "Task: task-hitl-8821 (500,000 VNĐ)",
      prevHash: "0a1b2c3d4e5f...",
      sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      compliance: "PII Cleaned (NĐ 13/2023)",
    },
    {
      id: "log-10293",
      timestamp: "2026-10-26 15:30:05",
      actor: "system:AgentHarness",
      action: "STOCK_RESERVE_PESSIMISTIC",
      target: "SKU: LT-ASUS-VIVO15-OLED (Qty: 1)",
      prevHash: "7f8e9d0a1b2c...",
      sha256Hash: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
      compliance: "SSOT PostgreSQL",
    },
    {
      id: "log-10292",
      timestamp: "2026-10-26 15:10:44",
      actor: "customer:CUST-883",
      action: "CHECKOUT_ORDER",
      target: "Order: MWG-20261026-9812",
      prevHash: "3b4c5d6e7f8a...",
      sha256Hash: "4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
      compliance: "Idempotency Enforced",
    },
  ];

  const rbacRoles = [
    {
      role: "Guest (Khách vãng lai)",
      scope: "Xem danh mục laptop, tra cứu thông tin chính sách công khai",
      dbPermissions: "SELECT trên Products (cột public)",
      llmTools: "rag_search_knowledge_base",
    },
    {
      role: "Customer (Khách hàng)",
      scope: "Tư vấn AI, so sánh sản phẩm, tạo giỏ hàng, đặt đơn, tra cứu đơn cá nhân",
      dbPermissions: "SELECT/INSERT Carts, Orders (sở hữu cá nhân)",
      llmTools: "rag_search_knowledge_base, check_laptop_stock, calculate_cart_preview, create_order_idempotent",
    },
    {
      role: "Admin (Quản trị viên)",
      scope: "Toàn quyền quản trị tồn kho, duyệt HITL Gate, đồng bộ RAG, cấu hình khuyến mãi",
      dbPermissions: "FULL CRUD có Transaction & Pessimistic Lock",
      llmTools: "HITL Override, Trigger Qdrant Sync, FinOps Audit View",
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Nhật Ký Kiểm Toán SHA-256 &amp; Ma Trận Phân Quyền RBAC (UC11/12)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sổ cái bất biến Tamper-Evident Hash Chain và phân quyền 3 Personas theo Hiến pháp AGENTS.md.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "logs"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sổ Cái Bất Biến SHA-256
          </button>
          <button
            onClick={() => setActiveTab("rbac")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "rbac"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Ma Trận RBAC (3 Personas)
          </button>
        </div>
      </div>

      {activeTab === "logs" ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Database className="w-4 h-4 text-blue-600" />
              <span>Chuỗi Khối Băm Liên Hoàn (H_i = SHA256(H_prev || Action))</span>
            </div>
            <span className="ts-badge-success text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              Bảo Mật Toàn Vẹn
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Thời Gian</th>
                  <th className="py-3 px-4">Tác Nhân (Actor)</th>
                  <th className="py-3 px-4">Hành Động</th>
                  <th className="py-3 px-4">Đối Tượng (Target)</th>
                  <th className="py-3 px-4">Giá Trị Băm SHA-256</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {log.timestamp}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {log.actor}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200/80 text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {log.target}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400 truncate max-w-[200px]" title={log.sha256Hash}>
                      {log.sha256Hash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rbacRoles.map((r, idx) => (
            <div key={idx} className="ts-feature-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                    <Users className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">{r.role}</h2>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block mb-1">Phạm vi quyền hạn:</span>
                    <p className="text-slate-700">{r.scope}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-1">Quyền CSDL (PostgreSQL):</span>
                    <p className="font-mono text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {r.dbPermissions}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-1">Công cụ Agent được gọi:</span>
                    <p className="font-mono text-blue-700 bg-blue-50/60 p-2 rounded-lg border border-blue-100">
                      {r.llmTools}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Hiến pháp AGENTS.md</span>
                <span className="ts-badge-success px-2 py-0.5 rounded-full font-bold">Chuẩn 2026</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </BrandSectionBackground>
  );
}
