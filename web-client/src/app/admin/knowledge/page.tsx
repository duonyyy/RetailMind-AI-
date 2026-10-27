'use client';

import React, { useState } from 'react';
import { BrandSectionBackground } from '@/components/patterns';
import { INITIAL_KNOWLEDGE_DOCS } from '@/features/admin-ingestion/services/ingestion-status.get';
import { Sha256Verifier } from '@/features/admin-ingestion/components/Sha256Verifier';
import {
  BookOpenCheck,
  CheckCircle2,
  RefreshCw,
  FileText,
} from 'lucide-react';

export default function AdminKnowledgePage() {
  const [documents, setDocuments] = useState(INITIAL_KNOWLEDGE_DOCS);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncQdrant = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1000);
  };

  const handleVerifiedUpload = (newDoc: {
    code: string;
    title: string;
    collection: string;
    sha256Hash: string;
    chunks: number;
  }) => {
    setDocuments((prev) => [
      {
        id: `doc-${Date.now()}`,
        code: newDoc.code,
        title: newDoc.title,
        collection: newDoc.collection,
        chunks: newDoc.chunks,
        vectorDim: 768,
        sha256Hash: newDoc.sha256Hash,
        status: 'INDEXED',
        lastSynced: 'Vừa xong',
      },
      ...prev,
    ]);
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
            <span>Quản Trị Kho Tri Thức RAG &amp; Qdrant Vector (SCR-19 • UC08)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Băm SHA-256 văn bản chính sách theo Nghị định 30/2020/NĐ-CP và đồng bộ sang chỉ mục HNSW Cosine Distance Qdrant.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSyncQdrant}
          disabled={isSyncing}
          className="ts-cta text-xs py-2 px-4 inline-flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Đang đồng bộ HNSW...' : 'Đồng Bộ Lại Toàn Bộ Qdrant'}</span>
        </button>
      </div>

      {/* SHA-256 Document Uploader Component */}
      <Sha256Verifier onVerifiedUpload={handleVerifiedUpload} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Vector Index Type</span>
          <span className="text-lg font-bold text-slate-900">Qdrant HNSW</span>
          <span className="text-[11px] text-blue-600 font-medium block mt-1">Cosine Distance (768 Dim)</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Tổng Số Chunks RAG</span>
          <span className="text-lg font-bold text-slate-900 tabular-nums">
            {documents.reduce((acc, d) => acc + d.chunks, 0)} Chunks
          </span>
          <span className="text-[11px] text-emerald-600 font-medium block mt-1">Semantic Cache: 100% Ready</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Mô Hình Embedding</span>
          <span className="text-lg font-bold text-slate-900">text-embedding-3-small</span>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">Two-Way Citation Verified</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Tài Liệu Đã Băm SHA-256 &amp; Lập Chỉ Mục ({documents.length})
          </h2>
          <span className="text-xs text-slate-400">PostgreSQL SSOT &rarr; Qdrant Retrieval</span>
        </div>

        <div className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>{doc.title}</span>
                  <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {doc.code}
                  </span>
                </div>
                <div className="text-slate-400 flex flex-wrap items-center gap-3">
                  <span className="font-mono">Collection: {doc.collection}</span>
                  <span>•</span>
                  <span className="tabular-nums">{doc.chunks} chunks</span>
                  <span>•</span>
                  <span>Cập nhật: {doc.lastSynced}</span>
                </div>
                <div className="font-mono text-[10px] text-slate-400 truncate max-w-xl">
                  SHA-256: {doc.sha256Hash}
                </div>
              </div>

              <span className="ts-badge-success text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 self-start sm:self-center">
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
