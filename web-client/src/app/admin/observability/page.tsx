"use client";

import React from "react";
import { BrandSectionBackground } from "@/components/patterns";
import {
  Activity,
  Terminal,
  Cpu,
  Zap,
  CheckCircle2,
  ExternalLink,
  Layers,
  Clock,
} from "lucide-react";

export default function AdminObservabilityPage() {
  const telemetry = {
    totalTraces: 1420,
    successRate: "99.8%",
    p95Latency: "142 ms",
    avgCostPerQuery: "$0.00012",
    openTelemetryCollector: "http://localhost:6006/v1/traces",
    phoenixEndpoint: "http://localhost:6006",
  };

  const sampleTraces = [
    {
      traceId: "trace-20261026-9021",
      spanName: "LangGraph.ConsultativeSalesAgent",
      status: "OK",
      latencyMs: 118,
      tokensTotal: 342,
      model: "gemini-2.5-flash",
      time: "15:42:01",
    },
    {
      traceId: "trace-20261026-9019",
      spanName: "NestJS.InternalTools.CheckStock",
      status: "OK",
      latencyMs: 14,
      tokensTotal: 0,
      model: "PostgreSQL Driver",
      time: "15:41:58",
    },
    {
      traceId: "trace-20261026-9015",
      spanName: "Qdrant.HNSW.SemanticSearch",
      status: "OK",
      latencyMs: 22,
      tokensTotal: 0,
      model: "text-embedding-3-small",
      time: "15:41:55",
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
            <Activity className="w-5 h-5 text-rose-600" />
            Giám Sát Arize Phoenix &amp; OpenTelemetry Traces (UC09)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi chi tiết độ trễ chuỗi suy luận LLM (Trace Spans), lượng token tiêu thụ và kiểm toán chi phí FinOps thời gian thực.
          </p>
        </div>

        <a
          href={telemetry.phoenixEndpoint}
          target="_blank"
          rel="noreferrer"
          className="ts-cta text-xs py-2 px-4 inline-flex items-center gap-1.5"
        >
          <span>Mở Arize Phoenix UI</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Tỷ Lệ Thành Công</span>
          <span className="text-2xl font-extrabold text-emerald-600">{telemetry.successRate}</span>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Zero HTTP 500</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Độ Trễ P95 (TTFT)</span>
          <span className="text-2xl font-extrabold text-blue-600 tabular-nums">{telemetry.p95Latency}</span>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Semantic Cache Enabled</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Chi Phí Bình Quân/Req</span>
          <span className="text-2xl font-extrabold text-amber-600 tabular-nums">{telemetry.avgCostPerQuery}</span>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">DuckDB FinOps Engine</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Tổng Spans Đã Ghi</span>
          <span className="text-2xl font-extrabold text-slate-900 tabular-nums">{telemetry.totalTraces}</span>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">OTel Tracing Active</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Dòng Sự Kiện Traces Mới Nhất
          </h2>
          <span className="text-xs font-mono text-slate-400">OpenTelemetry Collector :6006</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Trace ID</th>
                <th className="py-3 px-4">Tên Span (Phân Vùng Xử Lý)</th>
                <th className="py-3 px-4">Mô Hình / Driver</th>
                <th className="py-3 px-4 text-center">Độ Trễ</th>
                <th className="py-3 px-4 text-center">Tokens</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sampleTraces.map((tr) => (
                <tr key={tr.traceId} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                    {tr.traceId}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {tr.spanName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {tr.model}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-900 tabular-nums">
                    {tr.latencyMs} ms
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-600 tabular-nums">
                    {tr.tokensTotal}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="ts-badge-success text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {tr.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </BrandSectionBackground>
  );
}
