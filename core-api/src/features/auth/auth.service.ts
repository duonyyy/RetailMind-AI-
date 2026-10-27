import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export type UserRole = 'GUEST' | 'CUSTOMER' | 'ADMIN';

export interface UserDTO {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  permissions: string[];
}

@Injectable()
export class AuthService {
  private readonly mockUsers: UserDTO[] = [
    {
      id: 'usr-admin-01',
      email: 'admin@retailmind.ai',
      fullName: 'Quản Trị Viên Hệ Thống',
      role: 'ADMIN',
      phone: '0901234567',
      permissions: ['catalog:write', 'inventory:write', 'hitl:approve', 'finops:view'],
    },
    {
      id: 'usr-customer-01',
      email: 'customer@mwg.vn',
      fullName: 'Nguyễn Văn An (Khách hàng thân thiết)',
      role: 'CUSTOMER',
      phone: '0987654321',
      permissions: ['order:create', 'ticket:create', 'cart:manage'],
    },
  ];

  constructor(private readonly jwtService: JwtService) {}

  async login(email: string, role?: UserRole): Promise<{ token: string; user: UserDTO }> {
    let user = this.mockUsers.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
    if (!user) {
      user = {
        id: `usr-${Date.now()}`,
        email: email || 'guest@retailmind.ai',
        fullName: 'Khách hàng vãng lai',
        role: role || 'CUSTOMER',
        permissions: ['order:create'],
      };
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);
    return { token, user };
  }

  async getProfile(userId: string): Promise<UserDTO> {
    const user = this.mockUsers.find(u => u.id === userId);
    return (
      user || {
        id: userId,
        email: 'customer@retailmind.ai',
        fullName: 'Khách hàng',
        role: 'CUSTOMER',
        permissions: ['order:create'],
      }
    );
  }
}
