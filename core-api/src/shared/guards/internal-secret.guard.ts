import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

    const publicTools = new Set(['catalog-search','search_products','product-detail','get_product_details','compare-products','compare_products','inventory-check','check_inventory','policy-search','search_policy']);
    const tool = String(request.path || '').split('/').pop();
    if (!publicTools.has(tool)) throw new ForbiddenException('Công cụ cá nhân tạm thời chưa khả dụng.');
    if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
      throw new ForbiddenException(
        'Truy cập bị từ chối: Header X-Internal-Secret không hợp lệ hoặc bị thiếu.',
      );
    }

    return true;
  }
}
