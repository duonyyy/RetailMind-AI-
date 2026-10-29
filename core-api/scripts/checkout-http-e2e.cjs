// Synthetic fixtures only; removes precisely the rows created by this test.
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

async function main() {
  const { SUPPORT_TEST_DB_PASSWORD: password, SUPPORT_TEST_JWT_SECRET: secret } = process.env;
  if (!password || !secret) throw new Error('Missing test environment');
  const pool = new Pool({ host: '127.0.0.1', port: 5432, user: 'retailmind_user', password, database: 'retailmind_db' });
  const [user, store, product, variant] = Array.from({ length: 4 }, randomUUID);
  const suffix = randomUUID();
  const sku = `TEST-${suffix}`;
  const key = randomUUID();
  const token = jwt.sign({ sub: user, role: 'CUSTOMER', tokenType: 'access' }, secret, { algorithm: 'HS256', expiresIn: '5m' });
  let seeded = false;
  const call = async (path, method, body, idempotencyKey) => {
    const response = await fetch(`http://127.0.0.1:3000/api/proxy/${path}`, {
      method, headers: { Cookie: `access_token=${token}`, 'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const role = await client.query("SELECT id FROM roles WHERE upper(code)='CUSTOMER' LIMIT 1");
      const references = await client.query('SELECT (SELECT id FROM brands LIMIT 1) AS brand, (SELECT id FROM categories LIMIT 1) AS category');
      if (!role.rows.length || !references.rows[0].brand || !references.rows[0].category) throw new Error('Required reference data missing');
      await client.query('INSERT INTO users (id,role_id,email,password_hash,full_name,is_active) VALUES ($1,$2,$3,$4,$5,true)', [user, role.rows[0].id, `${suffix}@example.invalid`, 'synthetic-not-a-login', 'Synthetic checkout']);
      await client.query('INSERT INTO stores (id,code,name) VALUES ($1,$2,$3)', [store, `T-${suffix}`, 'Synthetic store']);
      await client.query('INSERT INTO products (id,brand_id,category_id,name,slug) VALUES ($1,$2,$3,$4,$5)', [product, references.rows[0].brand, references.rows[0].category, 'Synthetic product', `test-${suffix}`]);
      await client.query('INSERT INTO variants (id,product_id,sku,name,price_vnd) VALUES ($1,$2,$3,$4,$5)', [variant, product, sku, 'Synthetic variant', 123456]);
      await client.query('INSERT INTO inventory (store_id,variant_id,on_hand_qty,reserved_qty) VALUES ($1,$2,5,0)', [store, variant]);
      await client.query('COMMIT'); seeded = true;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }

    const dto = { storeId: store, items: [{ sku, quantity: 2 }] };
    const invalidSku = await call('orders/checkout', 'POST', { ...dto, items: [{ sku: `UNKNOWN-${suffix}`, quantity: 1 }] }, randomUUID());
    const invalidStore = await call('orders/checkout', 'POST', { ...dto, storeId: `UNKNOWN-${suffix}` }, randomUUID());
    if (invalidSku.status !== 404 || invalidStore.status !== 404) throw new Error(`unknown SKU/store statuses ${invalidSku.status}/${invalidStore.status}`);
    const invalidQuantity = await call('orders/checkout', 'POST', { ...dto, items: [{ sku, quantity: -1 }] }, randomUUID());
    if (invalidQuantity.status !== 400) throw new Error(`invalid quantity status ${invalidQuantity.status}`);
    const preview = await call('orders/preview', 'POST', dto);
    const price = preview.body?.data?.data;
    if (preview.status !== 201 || price?.subtotalVnd !== '246912' || !price.previewToken) throw new Error(`preview failed: ${preview.status}`);
    await pool.query('UPDATE variants SET price_vnd=123457 WHERE id=$1', [variant]);
    const stale = await call('orders/checkout', 'POST', { ...dto, previewToken: price.previewToken }, randomUUID());
    if (stale.status !== 409) throw new Error(`stale price status ${stale.status}`);
    await pool.query('UPDATE variants SET price_vnd=123456 WHERE id=$1', [variant]);
    const shortStock = await call('orders/checkout', 'POST', { ...dto, items: [{ sku, quantity: 6 }] }, randomUUID());
    if (shortStock.status !== 409) throw new Error(`insufficient stock status ${shortStock.status}`);
    const placed = await call('orders/checkout', 'POST', { ...dto, previewToken: price.previewToken }, key);
    const receipt = placed.body?.data?.data;
    if (placed.status !== 201 || !receipt?.orderId) throw new Error(`checkout failed: ${placed.status}`);
    const db = await pool.query('SELECT o.customer_id,o.store_id,o.total_vnd,oi.variant_id,oi.unit_price_vnd,oi.quantity,i.reserved_qty FROM orders o JOIN order_items oi ON oi.order_id=o.id JOIN inventory i ON i.store_id=o.store_id AND i.variant_id=oi.variant_id WHERE o.id=$1', [receipt.orderId]);
    const row = db.rows[0];
    if (!row || row.customer_id !== user || row.store_id !== store || row.variant_id !== variant || row.unit_price_vnd !== '123456' || row.total_vnd !== '271603' || row.quantity !== 2 || row.reserved_qty !== 2) throw new Error('Database order/price/inventory mismatch');
    const repeat = await call('orders/checkout', 'POST', { ...dto, previewToken: price.previewToken }, key);
    if (repeat.status !== 201 || repeat.body?.data?.data?.orderId !== receipt.orderId) throw new Error('Repeat idempotency key did not return the stored order');
    const lookup = await call(`orders/${receipt.orderId}`, 'GET');
    if (lookup.status !== 200 || lookup.body?.data?.data?.orderId !== receipt.orderId) throw new Error('Database lookup failed');
    const concurrent = await Promise.all([call('orders/checkout', 'POST', dto, randomUUID()), call('orders/checkout', 'POST', dto, randomUUID())]);
    if (concurrent.map(r => r.status).sort().join(',') !== '201,409') throw new Error(`concurrent stock statuses ${concurrent.map(r => r.status)}`);
    const remaining = await pool.query('SELECT reserved_qty FROM inventory WHERE store_id=$1 AND variant_id=$2', [store, variant]);
    if (remaining.rows[0]?.reserved_qty !== 4) throw new Error('Concurrent stock reservation mismatch');
    process.stdout.write('PASS: unknown SKU/store, invalid quantity, stale price, insufficient stock, DB preview/checkout, repeat key and concurrent stock reservation over frontend proxy.\n');
  } finally {
    if (seeded) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_id=$1)', [user]);
        await client.query('DELETE FROM orders WHERE customer_id=$1 AND store_id=$2', [user, store]);
        await client.query('DELETE FROM idempotency_keys WHERE key LIKE $1', [`${user}:%`]);
        await client.query('DELETE FROM inventory WHERE store_id=$1 AND variant_id=$2', [store, variant]);
        await client.query('DELETE FROM variants WHERE id=$1 AND sku=$2', [variant, sku]);
        await client.query('DELETE FROM products WHERE id=$1 AND slug=$2', [product, `test-${suffix}`]);
        await client.query('DELETE FROM stores WHERE id=$1 AND code=$2', [store, `T-${suffix}`]);
        await client.query('DELETE FROM users WHERE id=$1 AND email=$2', [user, `${suffix}@example.invalid`]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
      const remain = await pool.query('SELECT (SELECT count(*) FROM users WHERE id=$1)+(SELECT count(*) FROM stores WHERE id=$2)+(SELECT count(*) FROM products WHERE id=$3)+(SELECT count(*) FROM variants WHERE id=$4) AS n', [user, store, product, variant]);
      if (Number(remain.rows[0].n)) throw new Error('Fixture cleanup incomplete');
      process.stdout.write('PASS: synthetic fixtures removed and verified absent.\n');
    }
    await pool.end();
  }
}
main().catch(error => { process.stderr.write(`FAIL: ${error.message}\n`); process.exitCode = 1; });
