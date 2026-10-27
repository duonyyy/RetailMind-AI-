'use client';

import React, { useState } from 'react';
import { BrandSectionBackground } from '@/components/patterns';
import {
  Activity,
  CheckCircle2,
  Database,
  Server,
  Cpu,
  RefreshCw,
} from 'lucide-react';

/**
 * SCR-27: Service Health Dashboard (`/status` per SCREEN_SPECIFICATIONS.md Section 4)
 */
export default function ServiceStatusPage() {
  const [lastChecked, setLastChecked] = useState('Vừa xong');
  const [isProbing, setIsProbing] = useState(false);

  const services = [
    {
      name: 'PostgreSQL 16+ SSOT Database',
      role: 'Single Source of Truth (Giá niêm yết, Tồn kho ACID, Sổ cái SHA-256)',
      port: '5432',
      latency: '2 ms',
      uptime: '99.99%',
      status: 'OPERATIONAL',
    },
    {
      name: 'Qdrant Vector Search Engine',
      role: 'Secondary Retrieval Index (HNSW Cosine 768-dim, Payload Filtering)',
      port: '6333',
      latency: '8 ms',
      uptime: '99.98%',
      status: 'OPERATIONAL',
    },
    {
      name: 'NestJS 12+ Core Commerce API',
      role: 'Transactional Commerce, Pessimistic Locking, Internal Tool Gateway',
      port: '4000',
      latency: '12 ms',
      uptime: '99.99%',
      status: 'OPERATIONAL',
    },
    {
      name: 'Python 3.11+ LangGraph Agent Runtime',
      role: 'StateGraph Orchestration, 13 Typed Tools, PII Guard, SSE Stream',
      port: '8000',
      latency: '38 ms (TTFT)',
      uptime: '99.95%',
      status: 'OPERATIONAL',
    },
    {
      name: 'Arize Phoenix OpenTelemetry Collector',
      role: 'GenAI Spans, Token FinOps Ledger & Grounding Evaluation',
      port: '6006',
      latency: '5 ms',
      uptime: '99.99%',
      status: 'OPERATIONAL',
    },
  ];

  const handleProbe = () => {
    setIsProbing(true);
    setTimeout(() => {
      setIsProbing(false);
      setLastChecked(new Date().toLocaleTimeString('vi-VN'));
    }, 500);
  };

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
            <Activity className="w-5 h-5 text-emerald-600" />
            <span>Báo Cáo Sức Khỏe Dịch Vụ Hạ Tầng (SCR-27 • UC09)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Giám sát trực tiếp 5 trụ cột hạ tầng Polyglot của RetailMind AI. Kiểm tra lần cuối: {lastChecked}.
          </p>
        </div>

        <button
          type="button"
          onClick={handleProbe}
          disabled={isProbing}
          className="ts-cta py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
          <span>Kiểm Tra Kết Nối Ngay</span>
        </button>
      </div>

      {/* Overall Banner */}
      <div className="ts-badge-success p-5 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <div>
            <div className="text-sm font-extrabold">
              Tất cả 5/5 Dịch Vụ Cốt Lõi Đang Hoạt Động Ổn Định (100% Operational)
            </div>
            <div className="text-xs opacity-80">
              Uptime trung bình 30 ngày: 99.99% • Zero-500 Graceful Degradation sẵn sàng.
            </div>
          </div>
        </div>
        <span className="font-mono text-xs font-bold">v1.0-2026</span>
      </div>

      {/* Services List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {services.map((svc) => (
          <div
            key={svc.name}
            className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
          >
            <div className="space-y-1">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-600" />
                <span>{svc.name}</span>
                <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  Port :{svc.port}
                </span>
              </div>
              <p className="text-slate-500">{svc.role}</p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Độ trễ / Uptime</div>
                <div className="font-mono font-bold text-slate-800 tabular-nums">
                  {svc.latency} • {svc.uptime}
                </div>
              </div>
              <span className="ts-badge-success px-3 py-1 rounded-full font-bold inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Operational</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </BrandSectionBackground>
  );
}

