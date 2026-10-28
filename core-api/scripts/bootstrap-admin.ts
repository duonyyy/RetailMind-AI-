import 'reflect-metadata';
import * as argon2 from 'argon2';

async function main() {
  const email = process.env.BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_PASSWORD;
  if (!email || !password || password.length < 20) throw new Error('Set BOOTSTRAP_EMAIL and a random BOOTSTRAP_PASSWORD of at least 20 characters');
  if (!process.env.DB_DATABASE || !process.env.DB_HOST) throw new Error('DB_DATABASE and DB_HOST are required');
  process.env.NODE_ENV = 'production'; // Prevent query logs from printing the password hash.
  const { AppDataSource } = await import('../src/database/data-source');
  await AppDataSource.initialize();
  try {
    const roles = await AppDataSource.query(`SELECT id FROM roles WHERE lower(code) = 'admin'`);
    if (roles.length !== 1) throw new Error('Expected exactly one admin role');
    const existing = await AppDataSource.query('SELECT 1 FROM users WHERE lower(email) = $1', [email]);
    if (existing.length) throw new Error('Bootstrap email already exists; refusing to overwrite');
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    await AppDataSource.query('INSERT INTO users (role_id,email,password_hash,full_name,is_active) VALUES ($1,$2,$3,$4,true)', [roles[0].id, email, hash, 'Bootstrap administrator']);
    console.log('Bootstrap administrator created; no existing account modified.');
  } finally {
    await AppDataSource.destroy();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
