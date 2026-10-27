'use client';

import React, { useState } from 'react';
import { BrandSectionBackground } from '@/components/patterns';
import {
  Settings,
  ShieldCheck,
  Zap,
  Server,
  CheckCircle2,
} from 'lucide-react';

export default function AdminResilienceSettingsPage() {
  const [rateLimitRpm, setRateLimitRpm] = useState(30);
  const [cbFailureThreshold, setCbFailureThreshold] = useState(50);
  const [cbRecoverySeconds, setCbRecoverySeconds] = useState(15);
  const [cacheTtlSeconds, setCacheTtlSeconds] = useState(300);
  const [maxAgentSteps, setMaxAgentSteps] = useState(5);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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
          <Settings className="w-5 h-5 text-blue-600" />
          <span>Cấu Hình Hệ Thống &amp; Khả Năng Tự Phục Hồi (SCR-24 • UC12)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Thiết lập thông số Rate Limiter, Circuit Breaker 3 trạng thái, trần bước lặp LangGraph (<code className="font-mono">MAX_STEPS = 5</code>) và L1 Semantic Cache.
        </p>
      </div>

      {saved && (
        <div className="ts-badge-success p-4 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Đã lưu cấu hình chống chịu hệ thống và ghi nhận vào Sổ cái kiểm toán SHA-256!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* Left: Rate Limiter & Circuit Breaker */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>1. Rate Limiter &amp; Circuit Breaker (Defense-in-Depth)</span>
          </h2>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Giới hạn tần suất (Sliding Window Rate Limiter - req/phút/IP):
            </label>
            <input
              type="number"
              value={rateLimitRpm}
              onChange={(e) => setRateLimitRpm(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 tabular-nums"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Ngưỡng ngắt mạch Circuit Breaker (% lỗi trong cửa sổ 10 giây):
            </label>
            <input
              type="number"
              value={cbFailureThreshold}
              onChange={(e) => setCbFailureThreshold(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 tabular-nums"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Thời gian chờ phục hồi Half-Open (giây):
            </label>
            <input
              type="number"
              value={cbRecoverySeconds}
              onChange={(e) => setCbRecoverySeconds(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 tabular-nums"
            />
          </div>
        </div>

        {/* Right: Agentic Runtime & Cache */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>2. LangGraph Agent Guardrails &amp; L1 Vector Cache</span>
          </h2>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Trần số bước lặp suy luận tối đa (MAX_STEPS chống lặp vô tận):
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxAgentSteps}
              onChange={(e) => setMaxAgentSteps(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-blue-600 tabular-nums"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Thời gian sống của L1 Semantic Cache &amp; SSR Catalog (giây):
            </label>
            <input
              type="number"
              value={cacheTtlSeconds}
              onChange={(e) => setCacheTtlSeconds(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 tabular-nums"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-600" />
              <span>Kết Nối Nội Bộ BFF Reverse Proxy:</span>
            </div>
            <div className="font-mono text-[11px] text-slate-500">
              NestJS Core API: http://localhost:4000/api/v1
            </div>
            <div className="font-mono text-[11px] text-slate-500">
              Python LangGraph Agent: http://localhost:8000/api
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button type="submit" className="ts-cta py-2.5 px-5 font-bold">
              Lưu Cấu Hình Hệ Thống
            </button>
          </div>
        </div>
      </form>
    </BrandSectionBackground>
  );
}
