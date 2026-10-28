import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import * as crypto from 'crypto';
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
  constructor(
    private readonly jwtService: JwtService,
    @Optional()
    @InjectRepository(User)
    private readonly userRepo?: Repository<User>,
    @Optional()
    @InjectRepository(Role)
    private readonly roleRepo?: Repository<Role>,
    @Optional() private readonly dataSource?: DataSource,
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

    if (!this.userRepo || !this.roleRepo) {
      throw new UnauthorizedException('Dịch vụ xác thực chưa sẵn sàng.');
    }
    if (await this.userRepo.findOne({ where: { email } })) {
      throw new ConflictException('Email này đã được đăng ký trong hệ thống.');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const customerRole = await this.roleRepo.findOne({ where: { code: In(['CUSTOMER', 'customer']) } });
    if (!customerRole) throw new UnauthorizedException('Vai trò khách hàng chưa được cấu hình.');
    const saved = await this.userRepo.save(this.userRepo.create({
      email, passwordHash, fullName: dto.fullName, phone: dto.phone,
      roleId: customerRole.id, isActive: true,
    }));
    const userId = saved.id;

    const userDto: UserDTO = {
      id: userId,
      email,
      fullName: dto.fullName,
      role: 'CUSTOMER',
      phone: dto.phone,
      permissions: ['order:create', 'ticket:create', 'cart:manage'],
    };

    const tokens = await this.generateTokens(userDto);
    return { tokens, user: userDto };
  }

  /**
   * Đăng nhập: Xác thực mật khẩu Argon2id, kiểm tra tài khoản hoạt động và cấp cặp token
   */
  async login(email: string, password?: string, _roleOverride?: UserRole): Promise<AuthResult & { token: string }> {
    if (!this.userRepo || !email || !password) throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ.');
    const user = await this.userRepo.findOne({ where: { email: email.trim().toLowerCase() }, relations: ['role'] });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ.');
    let valid = false;
    try { valid = await argon2.verify(user.passwordHash, password); } catch { valid = false; }
    if (!valid) throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ.');
    if (!user.isActive) throw new ForbiddenException('Tài khoản đã bị vô hiệu hóa.');
    const userDto = await this.getProfile(user.id);
    const tokens = await this.generateTokens(userDto);
    return { tokens, token: tokens.accessToken, user: userDto };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    if (process.env.AUTH_REFRESH_ENABLED !== 'true') throw new UnauthorizedException('Phiên hết hạn; vui lòng đăng nhập lại.');
    if (!this.dataSource?.isInitialized || !refreshToken) throw new UnauthorizedException('Phiên không hợp lệ.');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    let replay = false;
    try {
      const rows = await runner.query('SELECT * FROM auth_refresh_sessions WHERE token_hash = $1 FOR UPDATE', [tokenHash]);
      const session = rows[0];
      if (!session) throw new UnauthorizedException('Phiên không hợp lệ.');
      if (session.used_at || session.revoked_at) {
        await runner.query('UPDATE auth_refresh_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [session.user_id]);
        replay = true;
        await runner.commitTransaction();
      } else {
        if (new Date(session.expires_at).getTime() <= Date.now()) throw new UnauthorizedException('Phiên đã hết hạn.');
        const user = await this.getProfile(session.user_id);
        const next = this.newRefreshToken();
        await runner.query('UPDATE auth_refresh_sessions SET used_at = NOW() WHERE id = $1', [session.id]);
        await runner.query("INSERT INTO auth_refresh_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')", [user.id, next.hash]);
        await runner.commitTransaction();
        return { accessToken: this.signAccess(user), refreshToken: next.token, expiresIn: 900 };
      }
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally { await runner.release(); }
    if (replay) throw new UnauthorizedException('Phiên đã bị thu hồi.');
    throw new UnauthorizedException('Phiên không hợp lệ.');
  }

  async revokeRefreshToken(token?: string): Promise<void> {
    if (!token || !this.dataSource?.isInitialized) return;
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    await this.dataSource.query('UPDATE auth_refresh_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL', [hash]);
  }

  async getProfile(userId: string): Promise<UserDTO> {
    if (this.userRepo) {
      const dbUser = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['role'],
      });
      if (dbUser && !dbUser.isActive) throw new ForbiddenException('Tài khoản đã bị vô hiệu hóa.');
      const roleCode = dbUser?.role?.code?.toUpperCase();
      if (dbUser && !['CUSTOMER', 'ADMIN'].includes(roleCode)) throw new UnauthorizedException('Vai trò không hợp lệ.');
      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          role: roleCode as UserRole,
          phone: dbUser.phone,
          permissions: ['order:create'],
        };
      }
    }

    throw new UnauthorizedException('Tài khoản không tồn tại.');
  }

  private newRefreshToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(32).toString('base64url');
    return { token, hash: crypto.createHash('sha256').update(token).digest('hex') };
  }

  private signAccess(user: UserDTO): string {
    if (!process.env.JWT_SECRET) throw new UnauthorizedException('Chưa cấu hình xác thực.');
    return this.jwtService.sign({ sub: user.id, email: user.email, role: user.role, fullName: user.fullName, tokenType: 'access' }, { secret: process.env.JWT_SECRET, expiresIn: '15m', algorithm: 'HS256' });
  }

  private async generateTokens(user: UserDTO): Promise<AuthTokens> {
    if (!this.dataSource?.isInitialized) throw new UnauthorizedException('Dịch vụ phiên chưa sẵn sàng.');
    const refresh = this.newRefreshToken();
    const accessToken = this.signAccess(user);
    await this.dataSource.query('INSERT INTO auth_refresh_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')', [user.id, refresh.hash]);
    return { accessToken, refreshToken: refresh.token, expiresIn: 900 };
  }
}
