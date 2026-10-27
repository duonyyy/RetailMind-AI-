import { KnowledgeDocItem } from '../types';

export const INITIAL_KNOWLEDGE_DOCS: KnowledgeDocItem[] = [
  {
    id: 'doc-mwg-warranty-2026',
    code: 'POL-MWG-WARRANTY-2026',
    title: 'Chính Sách Bảo Hành & Đổi Trả MWG 2026 (Đổi mới 30 ngày)',
    collection: 'retail_knowledge_base',
    chunks: 48,
    vectorDim: 768,
    sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'INDEXED',
    lastSynced: '2026-10-26 10:00',
  },
  {
    id: 'doc-commercial-law-2005',
    code: 'LAW-VN-COMM-301',
    title: 'Luật Thương Mại 2005 (Điều 301 Trần Phạt Hợp Đồng 8%)',
    collection: 'legal_statutes_vn',
    chunks: 112,
    vectorDim: 768,
    sha256Hash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    status: 'INDEXED',
    lastSynced: '2026-10-25 18:30',
  },
  {
    id: 'doc-personal-data-law-91',
    code: 'LAW-VN-PII-91-2025',
    title: 'Luật Bảo Vệ Dữ Liệu Cá Nhân 91/2025/QH15 & Nghị Định 13/2023/NĐ-CP',
    collection: 'privacy_compliance_vn',
    chunks: 85,
    vectorDim: 768,
    sha256Hash: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
    status: 'INDEXED',
    lastSynced: '2026-10-24 14:15',
  },
];

