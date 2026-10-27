import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEvent } from './entities/audit-event.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

const isDbEnabled = process.env.ENABLE_POSTGRES === 'true';

@Module({
  imports: [
    ...(isDbEnabled ? [TypeOrmModule.forFeature([AuditEvent])] : []),
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

