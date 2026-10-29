import {
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from './entities/policy.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { MinioStorageService } from '../../shared/storage/minio.service';
import { IngestionProducer } from '../ingestion/public-api';

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
    throw new ServiceUnavailableException('Chưa thể xác minh phiên bản tài liệu chính sách đã công bố.');
  }

  /** Upload stays unavailable until extraction and indexing are verified. */
  async uploadPolicyDocument(
    code: string,
    title: string,
    category: string,
    file: { buffer: Buffer; mimetype?: string; size: number; originalname?: string },
  ): Promise<{ policyId: string; versionNo: number; objectKey: string; checksumSha256: string }> {
    throw new ServiceUnavailableException('Chức năng lập chỉ mục tài liệu chưa khả dụng. Tệp chưa được tải lên hoặc đưa vào hàng đợi.');
  }
}
