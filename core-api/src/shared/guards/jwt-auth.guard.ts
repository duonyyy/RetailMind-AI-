import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('Thiếu mã truy cập (Bearer Token hoặc Access Cookie).');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'retailmind_jwt_secret_development_only',
      });

      if (payload.isActive === false || payload.is_active === false) {
        throw new ForbiddenException('Tài khoản đã bị quản trị viên vô hiệu hóa.');
      }

      request.user = {
        id: payload.sub || payload.id,
        email: payload.email,
        role: (payload.role || 'CUSTOMER').toUpperCase(),
        fullName: payload.fullName || payload.name,
      };

      return true;
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        throw err;
      }
      throw new UnauthorizedException('Mã truy cập không hợp lệ hoặc đã hết hạn.');
    }
  }

  private extractTokenFromRequest(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Also check cookies if parsed
    if (request.cookies && request.cookies.access_token) {
      return request.cookies.access_token;
    }

    return undefined;
  }
}

