import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_ENVELOPE_KEY } from '../decorators/skip-envelope.decorator';
import { ApiEnvelopeDto } from '../dto/api-envelope.dto';

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, any> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ENVELOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest();
    const url = req?.url || '';

    // Do not envelope internal tool responses or health checks
    if (skip || url.includes('/internal/tools') || url.includes('/health')) {
      return next.handle();
    }

    const traceId = (req['traceId'] as string) || (req.headers['x-trace-id'] as string) || 'unknown';

    return next.handle().pipe(
      map((data) => {
        // If data is already an envelope, return as-is
        if (data && typeof data === 'object' && 'success' in data && 'meta' in data) {
          return data;
        }
        return ApiEnvelopeDto.success(data, traceId);
      }),
    );
  }
}

