import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from '../orders/public-api';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';

const isDbEnabled = process.env.ENABLE_POSTGRES === 'true';

@Module({
  imports: [
    ...(isDbEnabled ? [TypeOrmModule.forFeature([SupportTicket])] : []),
  ],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}

