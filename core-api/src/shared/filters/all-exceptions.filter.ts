import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiEnvelopeDto } from '../dto/api-envelope.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const traceId =
      (request['traceId'] as string) ||
      (request.headers['x-trace-id'] as string) ||
      'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Đã có lỗi xảy ra trên hệ thống máy chủ.';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        errorCode = exception.name;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message = (obj['message'] as string) || exception.message;
        errorCode = (obj['error'] as string) || exception.name;
        details = obj['details'] || (Array.isArray(obj['message']) ? obj['message'] : undefined);
      }
    } else if (exception && typeof exception === 'object') {
      const err = exception as any;
      // Postgres error codes
      if (err.code === '23505') {
        status = HttpStatus.CONFLICT;
        errorCode = 'DUPLICATE_ENTRY';
        message = 'Dữ liệu đã tồn tại trong hệ thống (vi phạm ràng buộc duy nhất).';
      } else if (err.code === '23503') {
        status = HttpStatus.BAD_REQUEST;
        errorCode = 'FOREIGN_KEY_VIOLATION';
        message = 'Dữ liệu tham chiếu không tồn tại trong hệ thống.';
      } else {
        this.logger.error(`[Unhandled Error] [Trace: ${traceId}]: ${err.message}`, err.stack);
      }
    }

    // For internal agent tools routes, ensure error structure maintains compatibility
    if (request.url?.includes('/internal/tools')) {
      response.status(status).json({
        status: 'error',
        code: errorCode,
        message,
        details,
        trace_id: traceId,
      });
      return;
    }

    response
      .status(status)
      .json(ApiEnvelopeDto.error(errorCode, message, details, traceId));
  }
}

