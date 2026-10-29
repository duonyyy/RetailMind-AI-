import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/public-api';

/** Authenticates the end user separately from the internal service credential. */
@Injectable()
export class InternalUserGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers?.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ') || !header.slice(7).trim()) {
      throw new UnauthorizedException('Cần access token của người dùng.');
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new UnauthorizedException('Chưa cấu hình xác thực.');
    let payload: any;
    try {
      payload = this.jwt.verify(header.slice(7), { secret, algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedException('Access token không hợp lệ hoặc đã hết hạn.');
    }
    if (payload.tokenType !== 'access' || typeof payload.sub !== 'string' || !payload.sub.trim() || typeof payload.exp !== 'number') {
      throw new UnauthorizedException('Access token không hợp lệ.');
    }
    const user = await this.auth.getProfile(payload.sub);
    if (!user || user.id !== payload.sub || !['CUSTOMER', 'ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Danh tính hoặc vai trò không hợp lệ.');
    }
    request.internalUser = { id: user.id, role: user.role };
    return true;
  }
}
