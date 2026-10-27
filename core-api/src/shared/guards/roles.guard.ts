import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException('Không có quyền truy cập: Bạn chưa đăng nhập hoặc không có vai trò hợp lệ.');
    }

    const userRole = String(user.role).toUpperCase();
    const hasRole = requiredRoles.some((role) => role.toUpperCase() === userRole);

    if (!hasRole) {
      throw new ForbiddenException(
        `Không có quyền truy cập: Yêu cầu quyền [${requiredRoles.join(', ')}], quyền hiện tại [${userRole}].`,
      );
    }

    return true;
  }
}

