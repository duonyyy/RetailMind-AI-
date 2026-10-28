// Real HTTP + PostgreSQL integration test using synthetic, uniquely identified fixtures.
// Only rows created by this test are removed in the finally block.
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

async function main() {
  const { SUPPORT_TEST_DB_PASSWORD: password, SUPPORT_TEST_JWT_SECRET: secret } = process.env;
  if (!password || !secret) throw new Error('Missing test environment');
  const pool = new Pool({ host: '127.0.0.1', port: 5432, user: 'retailmind_user', password, database: 'retailmind_db' });
  const [alice, bob, store, order] = Array.from({ length: 4 }, () => crypto.randomUUID());
  const suffix = crypto.randomUUID();
  const syntheticPhone = '0912345678';
  let ticketId;
  let seeded = false;
  const token = (sub) => jwt.sign({ sub, role: 'CUSTOMER', tokenType: 'access' }, secret, { algorithm: 'HS256', expiresIn: '5m' });
  const cookie = (sub) => `access_token=${token(sub)}`;
  const call = async (path, method, sub, body) => {
    const headers = { 'Content-Type': 'application/json' };
    if (sub) headers.Cookie = cookie(sub);
    const response = await fetch(`http://127.0.0.1:3000/api/proxy/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    let json; try { json = await response.json(); } catch { json = {}; }
    return { status: response.status, json };
  };
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const roles = await client.query("SELECT id FROM roles WHERE upper(code)='CUSTOMER' LIMIT 1");
      if (!roles.rows.length) throw new Error('CUSTOMER role missing');
      for (const [id, label] of [[alice, 'alice'], [bob, 'bob']]) {
        await client.query('INSERT INTO users (id, role_id, email, password_hash, full_name, phone_number, is_active) VALUES ($1,$2,$3,$4,$5,$6,true)', [id, roles.rows[0].id, `${label}-${suffix}@example.invalid`, 'synthetic-not-a-login', 'Synthetic test', syntheticPhone]);
      }
      await client.query('INSERT INTO stores (id, code, name) VALUES ($1,$2,$3)', [store, `T-${suffix}`, 'Synthetic test']);
      await client.query('INSERT INTO orders (id, customer_id, store_id, total_vnd, order_no) VALUES ($1,$2,$3,$4,$5)', [order, alice, store, 100000, `TEST-${suffix}`]);
      await client.query('COMMIT');
      seeded = true;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }

    const dto = { orderId: order, title: 'Synthetic support', description: 'Synthetic issue', confirmedProfilePhone: syntheticPhone };
    const unauth = await call('support/tickets', 'POST', null, dto);
    if (unauth.status !== 401) throw new Error(`guest status ${unauth.status}`);
    const profile = await call('auth/me', 'GET', alice);
    if (profile.status !== 200 || profile.json?.data?.id !== alice || profile.json?.data?.phone !== syntheticPhone) throw new Error('profile check failed');
    const other = await call('support/tickets', 'POST', bob, dto);
    if (other.status !== 404) throw new Error(`cross-user status ${other.status}`);
    const wrong = await call('support/tickets', 'POST', alice, { ...dto, confirmedProfilePhone: '0999995678' });
    if (wrong.status !== 400) throw new Error(`phone mismatch status ${wrong.status}`);
    const created = await call('support/tickets', 'POST', alice, dto);
    if (![200, 201].includes(created.status) || !created.json?.data?.id || !created.json?.data?.ticketCode) throw new Error(`create status ${created.status}`);
    ticketId = created.json.data.id;
    const result = await pool.query('SELECT customer_id,order_id,ticket_code FROM support_tickets WHERE id=$1', [ticketId]);
    if (result.rowCount !== 1 || result.rows[0].customer_id !== alice || result.rows[0].order_id !== order || result.rows[0].ticket_code !== created.json.data.ticketCode) throw new Error('database receipt mismatch');
    const idor = await call(`support/tickets/${ticketId}`, 'GET', bob);
    if (idor.status !== 404) throw new Error(`ticket ownership status ${idor.status}`);
    process.stdout.write('PASS: frontend proxy → backend auth → PostgreSQL: guest 401, other owner 404, wrong phone 400, real ticket 201, cross-user ticket 404.\n');
  } finally {
    if (seeded) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Exact UUIDs generated above and synthetic owners bound all deletes.
        await client.query('DELETE FROM support_tickets WHERE customer_id=ANY($1::varchar[])', [[alice, bob]]);
        await client.query('DELETE FROM orders WHERE id=$1 AND customer_id=$2', [order, alice]);
        await client.query('DELETE FROM users WHERE id=ANY($1::uuid[]) AND email LIKE $2', [[alice, bob], `%-${suffix}@example.invalid`]);
        await client.query('DELETE FROM stores WHERE id=$1 AND code=$2', [store, `T-${suffix}`]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
      const remain = await pool.query('SELECT (SELECT count(*) FROM users WHERE id=ANY($1::uuid[])) + (SELECT count(*) FROM orders WHERE id=$2) + (SELECT count(*) FROM support_tickets WHERE customer_id=ANY($3::varchar[])) AS n', [[alice, bob], order, [alice, bob]]);
      if (Number(remain.rows[0].n) !== 0) throw new Error('Fixture cleanup incomplete');
      process.stdout.write('PASS: synthetic fixture rows removed and verified absent.\n');
    }
    await pool.end();
  }
}
main().catch((error) => { process.stderr.write(`FAIL: ${error.message}\n`); process.exitCode = 1; });
