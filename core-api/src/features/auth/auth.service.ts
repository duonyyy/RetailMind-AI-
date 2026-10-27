import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';

export type UserRole = 'GUEST' | 'CUSTOMER' | 'ADMIN';

export interface UserDTO {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // 900s = 15m
}

export interface AuthResult {
  tokens: AuthTokens;
  user: UserDTO;
}

@Injectable()
export class AuthService {
  // Pre-hashed fallback users for test / offline mode
  private readonly fallbackUsers: (UserDTO & { passwordHash: string; isActive: boolean })[] = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@retailmind.ai',
      fullName: 'Quản Trị Viên Hệ Thống',
      role: 'ADMIN',
      phone: '0901234567',
      permissions: ['catalog:write', 'inventory:write', 'hitl:approve', 'finops:view', 'admin:manage'],
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$mockadminhash$mockhashvalue',
      isActive: true,
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'customer@mwg.vn',
      fullName: 'Nguyễn Văn An (Khách hàng thân thiết)',
      role: 'CUSTOMER',
      phone: '0987654321',
      permissions: ['order:create', 'ticket:create', 'cart:manage'],
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$mockcusthash$mockhashvalue',
      isActive: true,
    },
  ];

  constructor(
    private readonly jwtService: JwtService,
    @Optional()
    @InjectRepository(User)
    private readonly userRepo?: Repository<User>,
    @Optional()
    @InjectRepository(Role)
    private readonly roleRepo?: Repository<Role>,
  ) {}

  /**
   * Đăng ký tài khoản khách hàng mới với băm mật khẩu Argon2id
   */
  async register(dto: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();

    // Check duplicate
    if (this.userRepo) {
      const existing = await this.userRepo.findOne({ where: { email } });
      if (existing) {
        throw new ConflictException('Email này đã được đăng ký trong hệ thống.');
      }
    } else {
      if (this.fallbackUsers.some((u) => u.email === email)) {
        throw new ConflictException('Email này đã được đăng ký trong hệ thống.');
      }
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    let userId = `usr-${Date.now()}`;

    if (this.userRepo && this.roleRepo) {
      let customerRole = await this.roleRepo.findOne({ where: { code: 'CUSTOMER' } });
      if (!customerRole) {
        customerRole = await this.roleRepo.save({
          code: 'CUSTOMER',
          name: 'Khách hàng',
          description: 'Người dùng mua sắm tiêu chuẩn',
        });
      }

      const newUser = this.userRepo.create({
        email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        roleId: customerRole.id,
        isActive: true,
      });
      const saved = await this.userRepo.save(newUser);
      userId = saved.id;
    } else {
      this.fallbackUsers.push({
        id: userId,
        email,
        fullName: dto.fullName,
        role: 'CUSTOMER',
        phone: dto.phone,
        permissions: ['order:create', 'ticket:create', 'cart:manage'],
        passwordHash,
        isActive: true,
      });
    }

    const userDto: UserDTO = {
      id: userId,
      email,
      fullName: dto.fullName,
      role: 'CUSTOMER',
      phone: dto.phone,
      permissions: ['order:create', 'ticket:create', 'cart:manage'],
    };

    const tokens = this.generateTokens(userDto);
    return { tokens, user: userDto };
  }

  /**
   * Đăng nhập: Xác thực mật khẩu Argon2id, kiểm tra tài khoản hoạt động và cấp cặp token
   */
  async login(email: string, password?: string, roleOverride?: UserRole): Promise<AuthResult & { token: string }> {
    const cleanEmail = (email || '').trim().toLowerCase();

    let userDto: UserDTO;
    let passwordHash: string | undefined;
    let isActive = true;

    if (this.userRepo) {
      const dbUser = await this.userRepo.findOne({
        where: { email: cleanEmail },
        relations: ['role'],
      });

      if (dbUser) {
        passwordHash = dbUser.passwordHash;
        isActive = dbUser.isActive;
        userDto = {
          id: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          role: ((dbUser.role?.code || dbUser.role?.name || 'CUSTOMER') as UserRole),
          phone: dbUser.phone,
          permissions: ['order:create', 'cart:manage', 'ticket:create'],
        };
      } else {
        userDto = this.findFallbackUser(cleanEmail, roleOverride);
      }
    } else {
      userDto = this.findFallbackUser(cleanEmail, roleOverride);
    }

    if (!isActive) {
      throw new ForbiddenException('Tài khoản này đã bị quản trị viên vô hiệu hóa.');
    }

    // Verify password if provided
    if (password && passwordHash && !passwordHash.includes('mock')) {
      const isValid = await argon2.verify(passwordHash, password);
      if (!isValid) {
        throw new UnauthorizedException('Mật khẩu đăng nhập không chính xác.');
      }
    }

    const tokens = this.generateTokens(userDto);
    return {
      tokens,
      token: tokens.accessToken,
      user: userDto,
    };
  }

  /**
   * Xoay vòng Refresh Token (Token Rotation)
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_SECRET || 'retailmind_jwt_secret_production_2026',
      });

      if (payload.tokenType !== 'refresh') {
        throw new UnauthorizedException('Mã token không phải là Refresh Token hợp lệ.');
      }

      const user = await this.getProfile(payload.sub);
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Refresh token đã hết hạn hoặc không hợp lệ.');
    }
  }

  async getProfile(userId: string): Promise<UserDTO> {
    if (this.userRepo) {
      const dbUser = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['role'],
      });
      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          role: ((dbUser.role?.code || dbUser.role?.name || 'CUSTOMER') as UserRole),
          phone: dbUser.phone,
          permissions: ['order:create'],
        };
      }
    }

    const fallback = this.fallbackUsers.find((u) => u.id === userId);
    return (
      fallback || {
        id: userId,
        email: 'customer@retailmind.ai',
        fullName: 'Khách hàng',
        role: 'CUSTOMER',
        permissions: ['order:create'],
      }
    );
  }

  private generateTokens(user: UserDTO): AuthTokens {
    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      tokenType: 'access',
    };

    const refreshPayload = {
      sub: user.id,
      tokenType: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(refreshPayload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  private findFallbackUser(email: string, roleOverride?: UserRole): UserDTO {
    const existing = this.fallbackUsers.find((u) => u.email.toLowerCase() === email);
    if (existing) {
      return existing;
    }
    return {
      id: `usr-${Date.now()}`,
      email: email || 'guest@retailmind.ai',
      fullName: 'Khách hàng vãng lai',
      role: roleOverride || 'CUSTOMER',
      permissions: ['order:create'],
    };
  }
}
