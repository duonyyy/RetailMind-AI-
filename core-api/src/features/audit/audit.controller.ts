import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../../shared/decorators/roles.decorator';

@Controller(['admin/audit-logs', 'audit'])
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Roles('ADMIN')
  @Get()
  async getLogs(@Query('limit') limit?: number) {
    return this.auditService.getRecentLogs(limit ? parseInt(String(limit), 10) : 50);
  }
}

