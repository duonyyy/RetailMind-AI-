"use client";

import React, { useState } from "react";
import { BrandSectionBackground } from "@/components/patterns";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  AlertTriangle,
  History,
} from "lucide-react";

export default function AdminHitlPage() {
  const [tasks, setTasks] = useState([
    {
      taskId: "task-hitl-8821",
      customerName: "Nguyễn Văn Hùng",
      phone: "0908***881",
      requestedAction: "Bồi hoàn 500.000 VNĐ vào ví khách hàng",
      reason: "Đơn hàng MWG-20261026-9812 giao chậm hơn cam kết 2.5 giờ.",
      thresholdPolicy: "Hạn mức AI tự duyệt: 200.000 VNĐ. Giá trị 500.000 VNĐ vượt ngưỡng bắt buộc Quản lý duyệt.",
      status: "PENDING",
      createdAt: "2026-10-26 15:45",
    },
    {
      taskId: "task-hitl-8819",
      customerName: "Lê Hoàng Phúc",
      phone: "0912***442",
      requestedAction: "Đổi mới 1-1 máy ngoài hạn 30 ngày (ngày thứ 32)",
      reason: "Khách hàng đi công tác nước ngoài, báo lỗi kỹ thuật màn hình OLED chớp sáng.",
      thresholdPolicy: "Quá hạn 30 ngày hệ thống yêu cầu Quản lý xác nhận ngoại lệ bảo hành.",
      status: "APPROVED",
      createdAt: "2026-10-26 11:20",
      reviewedBy: "Trần Minh Quản Lý (ADM01)",
    },
  ]);

  const handleApprove = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.taskId === id
          ? { ...t, status: "APPROVED", reviewedBy: "Nguyễn Quản Trị (ADMIN-01)" }
          : t
      )
    );
  };

  const handleReject = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.taskId === id
          ? { ...t, status: "REJECTED", reviewedBy: "Nguyễn Quản Trị (ADMIN-01)" }
          : t
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
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          Cổng Phê Duyệt Con Người — Human-in-the-Loop Gate (UC07)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Hàng đợi kiểm duyệt các hành động nhạy cảm vượt hạn mức tự động của Agent theo Điều 10 Đạo luật AI và Hiến pháp AGENTS.md.
        </p>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => (
          <div key={task.taskId} className="ts-feature-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-blue-600">
                  {task.taskId}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    task.status === "PENDING"
                      ? "ts-badge-warning animate-pulse"
                      : task.status === "APPROVED"
                      ? "ts-badge-success"
                      : "ts-badge-danger"
                  }`}
                >
                  {task.status === "PENDING"
                    ? "Chờ Quản Lý Duyệt"
                    : task.status === "APPROVED"
                    ? "Đã Phê Duyệt"
                    : "Đã Từ Chối"}
                </span>
              </div>
              <span className="text-xs text-slate-400">Thời gian tạo: {task.createdAt}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 block">Khách hàng &amp; SĐT:</span>
                  <span className="font-bold text-slate-800">{task.customerName} ({task.phone})</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Hành động yêu cầu:</span>
                  <span className="font-bold text-blue-700 text-sm">{task.requestedAction}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Lý do:</span>
                  <p className="text-slate-600">{task.reason}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                <div>
                  <span className="text-slate-400 font-bold block mb-1">Căn cứ kích hoạt HITL:</span>
                  <p className="text-slate-600">{task.thresholdPolicy}</p>
                </div>
                {task.reviewedBy && (
                  <div className="pt-2 border-t border-slate-200 text-slate-500">
                    Người duyệt: <span className="font-semibold text-slate-800">{task.reviewedBy}</span>
                  </div>
                )}
              </div>
            </div>

            {task.status === "PENDING" && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => handleReject(task.taskId)}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition"
                >
                  Từ Chối Yêu Cầu
                </button>
                <button
                  onClick={() => handleApprove(task.taskId)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                >
                  Phê Duyệt Cho Phép Thực Thi
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </BrandSectionBackground>
  );
}
