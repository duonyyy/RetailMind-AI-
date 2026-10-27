import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Policy } from './entities/policy.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { MinioStorageModule } from '../../shared/storage/minio.module';
import { IngestionFeatureModule } from '../ingestion/public-api';

const isDbEnabled = process.env.ENABLE_POSTGRES === 'true';

@Module({
  imports: [
    ...(isDbEnabled ? [TypeOrmModule.forFeature([Policy, DocumentVersion])] : []),
    MinioStorageModule,
    IngestionFeatureModule,
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}

