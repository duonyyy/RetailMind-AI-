import { Global, Module } from '@nestjs/common';
import { MinioStorageService } from './minio.service';

@Global()
@Module({
  providers: [MinioStorageService],
  exports: [MinioStorageService],
})
export class MinioStorageModule {}
