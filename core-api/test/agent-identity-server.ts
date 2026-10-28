import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AppDataSource } from '../src/database/data-source';
import { User } from '../src/features/auth/entities/user.entity';
import { Role } from '../src/features/auth/entities/role.entity';
import { AuthService } from '../src/features/auth/auth.service';
import { AuthController } from '../src/features/auth/auth.controller';
import { JwtAuthGuard } from '../src/shared/guards/jwt-auth.guard';
import { RolesGuard } from '../src/shared/guards/roles.guard';

async function main() {
  if (process.env.DB_DATABASE !== 'retailmind_auth_verify_20261028') throw new Error('Requires isolated test database');
  process.env.JWT_SECRET = 'isolated-test-signing-secret-only';
  await AppDataSource.initialize();
  await AppDataSource.query(`INSERT INTO roles (code, name) VALUES ('CUSTOMER', 'Customer'), ('ADMIN', 'Admin') ON CONFLICT (code) DO NOTHING`);
  const hash = await argon2.hash('temporary-agent-test-password');
  for (const role of ['CUSTOMER', 'ADMIN']) {
    await AppDataSource.query(`INSERT INTO users (role_id, email, password_hash, full_name)
      SELECT id, $1, $2, 'Agent Test' FROM roles WHERE code = $3 ON CONFLICT (email) DO UPDATE SET password_hash = $2, is_active = true`,
      [`agent-${role.toLowerCase()}@example.test`, hash, role]);
  }
  const jwt = new JwtService();
  const auth = new AuthService(jwt, AppDataSource.getRepository(User), AppDataSource.getRepository(Role), AppDataSource);
  const module = await Test.createTestingModule({ controllers: [AuthController], providers: [Reflector, { provide: AuthService, useValue: auth }] }).compile();
  const app = module.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalGuards(new JwtAuthGuard(module.get(Reflector), jwt, auth), new RolesGuard(module.get(Reflector)));
  // The agent expects the same success envelope as the full core application.
  const { TransformResponseInterceptor } = await import('../src/shared/interceptors/transform-response.interceptor');
  app.useGlobalInterceptors(new TransformResponseInterceptor(module.get(Reflector)));
  await app.listen(44117, '127.0.0.1');
  console.log('TEST_IDENTITY_SERVER_READY');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
