import 'reflect-metadata';
import { strict as assert } from 'assert';
import { JwtService } from '@nestjs/jwt';
import { AppDataSource } from '../src/database/data-source';
import { User } from '../src/features/auth/entities/user.entity';
import { Role } from '../src/features/auth/entities/role.entity';
import { AuthService } from '../src/features/auth/auth.service';

async function main() {
  if (process.env.DB_DATABASE !== 'retailmind_schema_rehearsal_20261028') throw new Error('Requires isolated schema rehearsal');
  process.env.JWT_SECRET = 'isolated-test-signing-secret-only';
  await AppDataSource.initialize();
  try {
    const email = 'synthetic@example.test';
    const initial = await AppDataSource.query('SELECT phone = phone_number AS matches FROM users WHERE email = $1', [email]);
    assert.equal(initial[0].matches, true);
    await AppDataSource.query('UPDATE users SET phone = $1 WHERE email = $2', ['0900000001', email]);
    const oldWriter = await AppDataSource.query('SELECT phone = phone_number AS matches FROM users WHERE email = $1', [email]);
    assert.equal(oldWriter[0].matches, true);
    await AppDataSource.query('UPDATE users SET phone_number = $1 WHERE email = $2', ['0900000002', email]);
    const newWriter = await AppDataSource.query('SELECT phone = phone_number AS matches FROM users WHERE email = $1', [email]);
    assert.equal(newWriter[0].matches, true);
    await assert.rejects(AppDataSource.query('UPDATE users SET phone=$1, phone_number=$2 WHERE email=$3', ['0900000003', '0900000004', email]));
    const auth = new AuthService(new JwtService(), AppDataSource.getRepository(User), AppDataSource.getRepository(Role), AppDataSource);
    const address = `legacy-${Date.now()}@example.test`;
    const registered = await auth.register({ email: address, password: 'temporary-pass-123', fullName: 'Test', phone: '0900000010' });
    const login = await auth.login(address, 'temporary-pass-123');
    assert.equal(login.user.role, 'CUSTOMER');
    assert.equal(login.user.id, registered.user.id);
    const saved = await AppDataSource.query('SELECT phone = phone_number AS matches FROM users WHERE id = $1', [registered.user.id]);
    assert.equal(saved[0].matches, true);
    console.log('PASS: existing phone preserved, old/new writes synced, conflicts rejected, lowercase role login');
  } finally {
    await AppDataSource.destroy();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
