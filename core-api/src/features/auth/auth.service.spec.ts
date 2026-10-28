import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService credentials', () => {
  it('verifies the password and derives the role from the database', async () => {
    process.env.JWT_SECRET = 'test-secret';
    const hash = await argon2.hash('correct-password');
    const record = { id: 'u1', email: 'user@example.com', fullName: 'User', isActive: true, passwordHash: hash, role: { code: 'CUSTOMER' } };
    const repo = { findOne: jest.fn().mockResolvedValue(record) };
    const db = { isInitialized: true, query: jest.fn().mockResolvedValue([]) };
    const jwt = { sign: jest.fn().mockReturnValue('access') };
    const service = new AuthService(jwt as unknown as JwtService, repo as any, undefined, db as any);
    await expect(service.login(record.email, 'wrong')).rejects.toThrow();
    const result = await service.login(record.email, 'correct-password', 'ADMIN');
    expect(result.user.role).toBe('CUSTOMER');
    expect(result.tokens.accessToken).toBe('access');
    expect(db.query).toHaveBeenCalledTimes(1);
  });
  it('rejects inactive users even with the correct password', async () => {
    const hash = await argon2.hash('correct-password');
    const repo = { findOne: jest.fn().mockResolvedValue({ id: 'u', passwordHash: hash, isActive: false }) };
    const service = new AuthService({} as JwtService, repo as any);
    await expect(service.login('user@example.com', 'correct-password')).rejects.toThrow();
  });
});
