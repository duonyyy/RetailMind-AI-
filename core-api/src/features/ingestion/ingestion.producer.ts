import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface IngestionJobPayload {
  policyId: string;
  documentVersionId: string;
  versionNo: number;
  objectKey: string;
  checksumSha256: string;
  visibility: 'public' | 'internal';
}

@Injectable()
export class IngestionProducer {
  private readonly logger = new Logger(IngestionProducer.name);

  constructor(@InjectQueue('document-ingestion') private ingestionQueue: Queue) {}

  async queueDocumentIngestion(payload: IngestionJobPayload) {
    this.logger.log(`Enqueueing document ingestion for Policy ${payload.policyId} (v${payload.versionNo})`);
    
    return await this.ingestionQueue.add('process-policy-document', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }
}
