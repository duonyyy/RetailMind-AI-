import 'reflect-metadata';
import { strict as assert } from 'assert';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AppDataSource } from '../src/database/data-source';
import { User } from '../src/features/auth/entities/user.entity';
import { Role } from '../src/features/auth/entities/role.entity';
import { AuthService } from '../src/features/auth/auth.service';
import { AuthController } from '../src/features/auth/auth.controller';
import { OrdersController } from '../src/features/orders/orders.controller';
import { OrdersService } from '../src/features/orders/orders.service';
import { AuditController } from '../src/features/audit/audit.controller';
import { AuditService } from '../src/features/audit/audit.service';
import { JwtAuthGuard } from '../src/shared/guards/jwt-auth.guard';
import { RolesGuard } from '../src/shared/guards/roles.guard';

async function main() {
  if (process.env.DB_DATABASE !== 'retailmind_auth_verify_20261028') throw new Error('Requires isolated auth test database');
  process.env.JWT_SECRET = 'isolated-test-signing-secret-only';
  await AppDataSource.initialize();
  const jwt = new JwtService();
  const auth = new AuthService(jwt, AppDataSource.getRepository(User), AppDataSource.getRepository(Role), AppDataSource);
  const orders = new OrdersService({} as any, {} as any);
  const module = await Test.createTestingModule({
    controllers: [AuthController, OrdersController, AuditController],
    providers: [Reflector, { provide: AuthService, useValue: auth }, { provide: OrdersService, useValue: orders },
      { provide: AuditService, useValue: { getRecentLogs: async () => [] } }],
  }).compile();
  const app = module.createNestApplication();
  app.useGlobalGuards(new JwtAuthGuard(module.get(Reflector), jwt, auth), new RolesGuard(module.get(Reflector)));
  await app.listen(0, '127.0.0.1');
  try {
    const base = await app.getUrl();
    await AppDataSource.query(`INSERT INTO roles (code, name) VALUES ('CUSTOMER', 'Customer'), ('ADMIN', 'Admin') ON CONFLICT (code) DO NOTHING`);
    const suffix = Date.now().toString();
    const a = await auth.register({ email: `a-${suffix}@example.test`, password: 'test-pass-123', fullName: 'A' });
    const b = await auth.register({ email: `b-${suffix}@example.test`, password: 'test-pass-123', fullName: 'B' });
    const roles = await AppDataSource.query(`SELECT id FROM roles WHERE code = 'ADMIN'`);
    const admins = await AppDataSource.query(`INSERT INTO users (role_id, email, password_hash, full_name) VALUES ($1,$2,$3,'Admin') RETURNING id`, [roles[0].id, `admin-${suffix}@example.test`, await argon2.hash('test-pass-123')]);
    const admin = await auth.login(`admin-${suffix}@example.test`, 'test-pass-123');
    (orders as any).ordersStore.set('order-a', { orderId: 'order-a', customerId: a.user.id });
    const request = (path: string, token?: string, init: RequestInit = {}) => fetch(`${base}${path}`, { ...init, headers: { ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    assert.equal((await request('/orders/order-a')).status, 401);
    assert.equal((await request('/orders/order-a', 'invalid')).status, 401);
    assert.equal((await request('/orders/order-a', b.tokens.accessToken)).status, 404);
    assert.equal((await request('/orders/order-a', a.tokens.accessToken)).status, 200);
    assert.equal((await request('/admin/audit-logs', b.tokens.accessToken)).status, 403);
    assert.equal((await request('/admin/audit-logs', admin.tokens.accessToken)).status, 200);
    const wrongType = jwt.sign({ sub: b.user.id, tokenType: 'refresh' }, { secret: process.env.JWT_SECRET, expiresIn: '1h' });
    assert.equal((await request('/auth/me', wrongType)).status, 401);
    const expired = jwt.sign({ sub: b.user.id, tokenType: 'access' }, { secret: process.env.JWT_SECRET, expiresIn: -1 });
    assert.equal((await request('/auth/me', expired)).status, 401);
    await AppDataSource.query('UPDATE users SET is_active = false WHERE id = $1', [admins[0].id]);
    assert.equal((await request('/admin/audit-logs', admin.tokens.accessToken)).status, 403);
    console.log('PASS: HTTP missing/invalid/expired/wrong-type token, ownership, roles and inactive account');
  } finally {
    await app.close();
    await AppDataSource.destroy();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
