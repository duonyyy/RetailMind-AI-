import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from './entities/policy.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { MinioStorageService } from '../../shared/storage/minio.service';
import { IngestionProducer } from '../ingestion/public-api';
import { assertValidUpload } from '../../shared/storage/image-upload.policy';

export interface PolicySearchResult {
  id: string;
  code: string;
  title: string;
  category: string;
  snippet: string;
  content: string;
}

@Injectable()
export class KnowledgeService {
  // Built-in fallback policies
  private readonly defaultPolicies: PolicySearchResult[] = [
    {
      id: 'POL_2026_RETURN',
      code: 'POL_RETURN_30D',
      title: 'Chính Sách Đổi Trả & Bảo Hành RetailMind AI 2026',
      category: 'warranty',
      snippet: 'Đổi trả trong 30 ngày nguyên hộp, hóa đơn. Bảo hành 24 tháng chính hãng tại MWG.',
      content:
        'Khách hàng được quyền đổi trả hàng trong vòng 30 ngày kể từ ngày nhận hàng với điều kiện sản phẩm còn nguyên tem mác, nguyên hộp và hóa đơn mua hàng. Bảo hành chính hãng 24 tháng tại các trung tâm ủy quyền toàn quốc.',
    },
    {
      id: 'POL_2026_REFUND',
      code: 'POL_REFUND_LIMIT',
      title: 'Quy Chế Quản Trị Tài Chính & Hạn Mức Bồi Hoàn 2026',
      category: 'refund',
      snippet: '<= 200k tự động duyệt; 200k - 2tr cần Quản lý duyệt (HITL Gate); > 2tr cần Giám đốc Tài chính duyệt.',
      content:
        'Mọi khoản bồi hoàn từ 200.000 VNĐ trở xuống được AI tự động duyệt. Từ 200.000 đến 2.000.000 VNĐ cần Quản lý duyệt (HITL Gate). Vượt 2.000.000 VNĐ cần Giám đốc Tài chính phê duyệt.',
    },
  ];

  constructor(
    private readonly minioStorage: MinioStorageService,
    private readonly ingestionProducer: IngestionProducer,
    @Optional()
    @InjectRepository(Policy)
    private readonly policyRepo?: Repository<Policy>,
    @Optional()
    @InjectRepository(DocumentVersion)
    private readonly docVersionRepo?: Repository<DocumentVersion>,
  ) {}

  /**
   * Tra cứu chính sách bảo hành, đổi trả và tài chính
   */
  async searchPolicy(query: string, topK = 5): Promise<PolicySearchResult[]> {
    const q = (query || '').toLowerCase().trim();

    if (this.policyRepo) {
      const dbPolicies = await this.policyRepo.find({ where: { is_active: true } });
      if (dbPolicies.length > 0) {
        const matches = dbPolicies.filter(
          (p) => p.title.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
        );
        if (matches.length > 0) {
          return matches.slice(0, topK).map((p) => ({
            id: p.id,
            code: p.code,
            title: p.title,
            category: p.category,
            snippet: p.title,
            content: p.title,
          }));
        }
      }
    }

    // Fallback matching
    const matches = this.defaultPolicies.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.snippet.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q),
    );

    return (matches.length > 0 ? matches : this.defaultPolicies).slice(0, topK);
  }

  /**
   * Tải lên tài liệu chính sách mới (Admin)
   * 1. Kiểm tra Magic Bytes
   * 2. Lưu MinIO SHA-256
   * 3. Lưu bản ghi document_versions
   * 4. Đẩy tác vụ vào BullMQ Ingestion Queue
   */
  async uploadPolicyDocument(
    code: string,
    title: string,
    category: string,
    file: { buffer: Buffer; mimetype?: string; size: number; originalname?: string },
  ): Promise<{ policyId: string; versionNo: number; objectKey: string; checksumSha256: string }> {
    // 1. Kiểm tra Magic Bytes
    const { contentType, extension } = assertValidUpload(file);
    const fileName = `${code}.${extension}`;

    // 2. Upload vào MinIO Object Storage
    const { objectKey, checksumSha256 } = await this.minioStorage.uploadDocument(
      fileName,
      file.buffer,
      contentType,
    );

    let policyId = `pol-${code.toLowerCase()}`;
    let documentVersionId = `ver-${code.toLowerCase()}-1`;
    let versionNo = 1;

    // 3. Lưu vào PostgreSQL nếu kết nối sẵn sàng
    if (this.policyRepo && this.docVersionRepo) {
      let policy = await this.policyRepo.findOne({ where: { code } });
      if (!policy) {
        policy = await this.policyRepo.save({
          code,
          title,
          category: category || 'warranty',
          is_active: true,
        });
      }
      policyId = policy.id;

      const lastVer = await this.docVersionRepo.findOne({
        where: { policy_id: policyId },
        order: { version_no: 'DESC' },
      });
      versionNo = lastVer ? lastVer.version_no + 1 : 1;

      const savedVer = await this.docVersionRepo.save({
        policy_id: policyId,
        version_no: versionNo,
        minio_object_key: objectKey,
        checksum_sha256: checksumSha256,
        status: 'processing',
      });
      documentVersionId = savedVer.id;
    }

    // 4. Đẩy Job vào hàng đợi BullMQ để worker bóc tách 11 bậc NĐ 30/2020
    await this.ingestionProducer.queueDocumentIngestion({
      policyId,
      documentVersionId,
      versionNo,
      objectKey,
      checksumSha256,
      visibility: 'public',
    });

    return {
      policyId,
      versionNo,
      objectKey,
      checksumSha256,
    };
  }
}
