"use client";

import React, { useState } from "react";
import { BrandSectionBackground } from "@/components/patterns";
import {
  BookOpenCheck,
  Search,
  Upload,
  Database,
  CheckCircle2,
  RefreshCw,
  FileText,
  Sparkles,
} from "lucide-react";

export default function AdminKnowledgePage() {
  const [documents, setDocuments] = useState([
    {
      id: "doc-mwg-warranty-2026",
      title: "Chính Sách Bảo Hành & Đổi Trả MWG 2026",
      collection: "retail_knowledge_base",
      chunks: 48,
      vectorDim: 768,
      status: "INDEXED",
      lastSynced: "2026-10-26 10:00",
    },
    {
      id: "doc-commercial-law-2005",
      title: "Luật Thương Mại 2005 (Điều 301 Phạt Hợp Đồng)",
      collection: "legal_statutes_vn",
      chunks: 112,
      vectorDim: 768,
      status: "INDEXED",
      lastSynced: "2026-10-25 18:30",
    },
    {
      id: "doc-personal-data-law-91",
      title: "Luật Bảo Vệ Dữ Liệu Cá Nhân 91/2025 & NĐ 13/2023",
      collection: "privacy_compliance_vn",
      chunks: 85,
      vectorDim: 768,
      status: "INDEXED",
      lastSynced: "2026-10-24 14:15",
    },
  ]);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncQdrant = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1500);
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
            <BookOpenCheck className="w-5 h-5 text-blue-600" />
            Quản Lý Tri Thức RAG &amp; Qdrant Vector (UC08)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đồng bộ văn bản pháp lý, chính sách nội bộ và catalogue sản phẩm sang Vector DB Qdrant với chỉ mục HNSW Cosine Distance.
          </p>
        </div>

        <button
          onClick={handleSyncQdrant}
          disabled={isSyncing}
          className="ts-cta text-xs py-2 px-4 inline-flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          <span>{isSyncing ? "Đang đồng bộ..." : "Đồng Bộ Lại Qdrant"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Vector Index Type</span>
          <span className="text-lg font-bold text-slate-900">Qdrant HNSW</span>
          <span className="text-[11px] text-blue-600 font-medium block mt-1">Cosine Distance (768 Dim)</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Tổng Số Chunks RAG</span>
          <span className="text-lg font-bold text-slate-900">245 Chunks</span>
          <span className="text-[11px] text-emerald-600 font-medium block mt-1">Semantic Cache: 100% Ready</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Mô Hình Embedding</span>
          <span className="text-lg font-bold text-slate-900">text-embedding-3-small</span>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">Resilient Offline Fallback</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Tài Liệu Đang Lập Chỉ Mục ({documents.length})
          </h2>
          <span className="text-xs text-slate-400">PostgreSQL SSOT &rarr; Qdrant Retrieval</span>
        </div>

        <div className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 flex items-center justify-between gap-4 text-xs">
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  {doc.title}
                </div>
                <div className="text-slate-400 mt-1 flex items-center gap-3">
                  <span className="font-mono">Collection: {doc.collection}</span>
                  <span>•</span>
                  <span>{doc.chunks} chunks</span>
                  <span>•</span>
                  <span>Cập nhật: {doc.lastSynced}</span>
                </div>
              </div>

              <span className="ts-badge-success text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đã Vector Hóa
              </span>
            </div>
          ))}
        </div>
      </div>
    </BrandSectionBackground>
  );
}
