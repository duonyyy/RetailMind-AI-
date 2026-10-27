import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IngestionProducer } from './ingestion.producer';
import { IngestionProcessor } from './ingestion.processor';
import { MinioStorageModule } from '../../shared/storage/minio.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'document-ingestion',
    }),
    MinioStorageModule,
  ],
  providers: [IngestionProducer, IngestionProcessor],
  exports: [IngestionProducer],
})
export class IngestionFeatureModule {}
