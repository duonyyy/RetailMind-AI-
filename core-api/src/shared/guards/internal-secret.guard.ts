import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class InternalSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedSecret =
      request.headers['x-internal-secret'] || request.headers['x-internal-token'];

    const expectedSecret =
      this.configService.get<string>('INTERNAL_TOOL_SECRET') ||
      this.configService.get<string>('INTERNAL_API_SECRET') ||
      process.env.INTERNAL_TOOL_SECRET;

    if (!expectedSecret || !providedSecret) {
      throw new ForbiddenException(
        'Truy cập bị từ chối: Header X-Internal-Secret không hợp lệ hoặc bị thiếu.',
      );
    }

    const bufProvided = Buffer.from(String(providedSecret));
    const bufExpected = Buffer.from(String(expectedSecret));

    if (
      bufProvided.length !== bufExpected.length ||
      !crypto.timingSafeEqual(bufProvided, bufExpected)
    ) {
      throw new ForbiddenException(
        'Truy cập bị từ chối: Header X-Internal-Secret không hợp lệ hoặc bị thiếu.',
      );
    }

    return true;
  }
}
