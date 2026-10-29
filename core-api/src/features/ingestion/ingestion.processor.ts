import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IngestionJobPayload } from './ingestion.producer';
import { MinioStorageService } from '../../shared/storage/minio.service';

@Processor('document-ingestion')
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(private minioStorage: MinioStorageService) {
    super();
  }

  async process(job: Job<IngestionJobPayload>): Promise<any> {
    const { policyId, versionNo } = job.data;
    this.logger.log(`Processing ingestion job ${job.id} for Policy ${policyId} (v${versionNo})`);

    // Uploaded PDF/images require extraction, embeddings, verified Qdrant writes,
    // and version publication checks. None is wired here yet. BullMQ must record
    // a failed job instead of treating simulated processing as successful.
    throw new Error('Ingestion unavailable: extraction and verified Qdrant indexing are not configured.');
  }

}
