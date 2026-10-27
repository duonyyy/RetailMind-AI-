import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KnowledgeService } from './knowledge.service';
import { Public } from '../../shared/decorators/public.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';

@Controller('policies')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Public()
  @Get('search')
  async search(@Query('q') query: string, @Query('topK') topK?: number) {
    return this.knowledgeService.searchPolicy(query, topK ? parseInt(String(topK), 10) : 5);
  }

  @Roles('ADMIN')
  @Post('admin/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPolicy(
    @Body('code') code: string,
    @Body('title') title: string,
    @Body('category') category: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('Tệp tải lên không được để trống.');
    }
    if (!code || !title) {
      throw new BadRequestException('Mã chính sách (code) và tiêu đề (title) là bắt buộc.');
    }
    return this.knowledgeService.uploadPolicyDocument(code, title, category, file);
  }
}

