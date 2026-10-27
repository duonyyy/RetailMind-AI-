import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService (Argon2id & Token Rotation)', () => {
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn((payload) => `mock_token_${payload.tokenType || 'access'}_${payload.sub}`),
            verify: jest.fn((token) => ({
              sub: '00000000-0000-0000-0000-000000000002',
              tokenType: 'refresh',
            })),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should register a new customer with Argon2id hash', async () => {
    const result = await authService.register({
      email: 'newuser@mwg.vn',
      password: 'StrongPassword123!',
      fullName: 'Trần Văn Mới',
      phone: '0912345678',
    });

    expect(result.tokens).toBeDefined();
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    expect(result.user.email).toBe('newuser@mwg.vn');
    expect(result.user.role).toBe('CUSTOMER');
  });

  it('should prevent registration of existing email', async () => {
    await expect(
      authService.register({
        email: 'customer@mwg.vn',
        password: 'Password123!',
        fullName: 'Nguyễn Văn An',
      }),
    ).rejects.toThrow('Email này đã được đăng ký');
  });

  it('should login fallback user and issue access and refresh tokens', async () => {
    const result = await authService.login('customer@mwg.vn');
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    expect(result.user.role).toBe('CUSTOMER');
  });

  it('should rotate tokens on valid refresh token', async () => {
    const newTokens = await authService.refreshToken('valid_mock_refresh_token');
    expect(newTokens.accessToken).toBeDefined();
    expect(newTokens.refreshToken).toBeDefined();
  });
});

