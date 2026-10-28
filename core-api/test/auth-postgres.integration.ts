import 'reflect-metadata';
import { strict as assert } from 'assert';
import { JwtService } from '@nestjs/jwt';
import { AppDataSource } from '../src/database/data-source';
import { User } from '../src/features/auth/entities/user.entity';
import { Role } from '../src/features/auth/entities/role.entity';
import { AuthService } from '../src/features/auth/auth.service';

async function main() {
  if (process.env.DB_DATABASE !== 'retailmind_auth_verify_20261028') throw new Error('Requires isolated auth test database');
  process.env.JWT_SECRET = 'isolated-test-signing-secret-only';
  process.env.AUTH_REFRESH_ENABLED = 'true';
  AppDataSource.setOptions({ logging: false });
  await AppDataSource.initialize();
  try {
    await AppDataSource.query(`INSERT INTO roles (code, name) VALUES ('CUSTOMER', 'Customer') ON CONFLICT (code) DO NOTHING`);
    const service = new AuthService(new JwtService(), AppDataSource.getRepository(User), AppDataSource.getRepository(Role), AppDataSource);
    const email = `test-${Date.now()}@example.test`;
    const registered = await service.register({ email, password: 'temporary-pass-123', fullName: 'Test' });
    await assert.rejects(service.login(email, 'incorrect'));
    const logged = await service.login(email, 'temporary-pass-123');
    const rotated = await service.refreshToken(logged.tokens.refreshToken);
    assert.notEqual(rotated.refreshToken, logged.tokens.refreshToken);
    await assert.rejects(service.refreshToken(logged.tokens.refreshToken));
    await assert.rejects(service.refreshToken(rotated.refreshToken));
    const again = await service.login(email, 'temporary-pass-123');
    const simultaneous = await Promise.allSettled([service.refreshToken(again.tokens.refreshToken), service.refreshToken(again.tokens.refreshToken)]);
    assert.equal(simultaneous.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(simultaneous.filter(r => r.status === 'rejected').length, 1);
    const success = simultaneous.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<{ refreshToken: string }>;
    await assert.rejects(service.refreshToken(success.value.refreshToken));
    const logoutSession = await service.login(email, 'temporary-pass-123');
    await service.revokeRefreshToken(logoutSession.tokens.refreshToken);
    await assert.rejects(service.refreshToken(logoutSession.tokens.refreshToken));
    const restartSession = await service.login(email, 'temporary-pass-123');
    await AppDataSource.destroy();
    await AppDataSource.initialize();
    const restarted = new AuthService(new JwtService(), AppDataSource.getRepository(User), AppDataSource.getRepository(Role), AppDataSource);
    assert.ok((await restarted.refreshToken(restartSession.tokens.refreshToken)).accessToken);
    await AppDataSource.query('UPDATE users SET is_active = false WHERE id = $1', [registered.user.id]);
    await assert.rejects(restarted.login(email, 'temporary-pass-123'));
    console.log('PASS: credentials, rotation, replay, concurrent refresh, logout, reconnect, inactive user');
  } finally {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
