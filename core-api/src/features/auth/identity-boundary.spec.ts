import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';

describe('identity boundary', () => {
  it('rejects missing password and unknown users', async () => {
    const repo = { findOne: jest.fn().mockResolvedValue(null) };
    const service = new AuthService({} as JwtService, repo as any);
    await expect(service.login('user@example.com')).rejects.toThrow();
    await expect(service.login('user@example.com', 'wrong')).rejects.toThrow();
  });

  it('rejects a refresh JWT as an access token', async () => {
    process.env.JWT_SECRET = 'test-only-secret';
    const guard = new JwtAuthGuard(new Reflector(), { verify: () => ({ sub: 'u', exp: 9999999999, tokenType: 'refresh' }) } as any, {} as AuthService);
    const request = { headers: { authorization: 'Bearer token' } };
    const context = { getHandler: () => () => {}, getClass: () => class {}, switchToHttp: () => ({ getRequest: () => request }) };
    await expect(guard.canActivate(context as any)).rejects.toThrow();
  });

  it('rejects refresh by default until the database flow is verified', async () => {
    delete process.env.AUTH_REFRESH_ENABLED;
    const service = new AuthService({} as JwtService);
    await expect(service.refreshToken('token')).rejects.toThrow('đăng nhập lại');
  });
});
