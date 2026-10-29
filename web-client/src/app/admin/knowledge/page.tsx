import { BrandSectionBackground } from '@/components/patterns';

export default function AdminKnowledgePage() {
  return (
    <BrandSectionBackground variant="soft-blue" pattern="dot" patternOpacity={0.05} withGlow className="min-h-full p-6 sm:p-8">
      <div className="max-w-3xl rounded-2xl border border-amber-200 bg-white p-6 space-y-3">
        <h1 className="text-xl font-bold text-slate-900">Quản trị kho tri thức</h1>
        <p className="text-sm text-slate-700" role="status">
          Chức năng tải lên và lập chỉ mục tài liệu hiện chưa khả dụng. Hệ thống chưa xác minh việc trích xuất tài liệu và ghi dữ liệu vào Qdrant.
        </p>
        <p className="text-sm text-slate-600">Vui lòng thử lại khi chức năng này được kết nối và kiểm thử.</p>
      </div>
    </BrandSectionBackground>
  );
}
