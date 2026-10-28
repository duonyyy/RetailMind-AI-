// Isolated integration check: every synthetic row lives inside one rolled-back transaction.
require('reflect-metadata');
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');
const crypto = require('crypto');
const { DataSource } = require('typeorm');
const common = require('@nestjs/common');

function load(sourcePath, dependencies) {
  const code = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true },
  }).outputText;
  const output = {};
  vm.runInThisContext(`(function(exports, require) { ${code}\n})`, { filename: sourcePath })(output, (name) => {
    if (Object.prototype.hasOwnProperty.call(dependencies, name)) return dependencies[name];
    return require(name);
  });
  return output;
}

async function main() {
  if (!process.env.SUPPORT_TEST_DB_PASSWORD) throw new Error('Missing test database password');
  const { SupportTicket } = load('src/features/orders/entities/support-ticket.entity.ts', {});
  const { SupportService } = load('src/features/support/support.service.ts', {
    '../orders/public-api': { SupportTicket },
  });
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5432,
    username: 'retailmind_user', password: process.env.SUPPORT_TEST_DB_PASSWORD,
    database: 'retailmind_db', entities: [SupportTicket], synchronize: false, logging: false });
  await ds.initialize();
  const runner = ds.createQueryRunner();
  const ids = Array.from({ length: 5 }, () => crypto.randomUUID());
  const [role, alice, bob, store, order] = ids;
  const suffix = crypto.randomUUID();
  let createdTicket;
  try {
    await runner.connect();
    await runner.startTransaction();
    const q = (sql, params) => runner.query(sql, params);
    await q('INSERT INTO roles (id, code, name) VALUES ($1, $2, $3)', [role, `TEST_${suffix}`, 'Synthetic test']);
    for (const [id, email] of [[alice, `alice-${suffix}@example.invalid`], [bob, `bob-${suffix}@example.invalid`]]) {
      await q('INSERT INTO users (id, role_id, email, password_hash, full_name, phone_number, is_active) VALUES ($1,$2,$3,$4,$5,$6,true)', [id, role, email, 'synthetic-not-a-login', 'Synthetic user', '0912345678']);
    }
    await q('INSERT INTO stores (id, code, name) VALUES ($1,$2,$3)', [store, `T-${suffix}`, 'Synthetic store']);
    await q('INSERT INTO orders (id, customer_id, store_id, total_vnd, order_no) VALUES ($1,$2,$3,$4,$5)', [order, alice, store, 100000, `TEST-${suffix}`]);
    const repo = runner.manager.getRepository(SupportTicket);
    // Service calls the real TypeORM manager inside this already-open transaction.
    const service = new SupportService(repo, { isInitialized: true, transaction: (fn) => fn(runner.manager) });
    const dto = { orderId: order, title: 'Synthetic support', description: 'Synthetic issue', confirmedProfilePhone: '0912345678' };
    const result = await service.createTicket(alice, dto);
    createdTicket = result.id;
    const records = await q('SELECT customer_id, order_id, ticket_code FROM support_tickets WHERE id=$1', [createdTicket]);
    if (records.length !== 1 || records[0].customer_id !== alice || records[0].order_id !== order || records[0].ticket_code !== result.ticketCode) throw new Error('Persisted ticket mismatch');
    for (const [user, input, expected] of [[bob, dto, 404], [alice, { ...dto, confirmedProfilePhone: '0999995678' }, 400]]) {
      try { await service.createTicket(user, input); throw new Error('Unexpected success'); }
      catch (error) { if (!(error instanceof common.HttpException) || error.getStatus() !== expected) throw error; }
    }
    const count = await q('SELECT count(*)::int AS n FROM support_tickets WHERE customer_id IN ($1,$2)', [alice, bob]);
    if (count[0].n !== 1) throw new Error('Unexpected ticket count');
    process.stdout.write('PASS: real PostgreSQL create, cross-user denial, phone mismatch, single ticket; rolling back fixtures.\n');
  } finally {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.release();
    if (createdTicket) {
      const after = await ds.query('SELECT count(*)::int AS n FROM support_tickets WHERE id=$1', [createdTicket]);
      if (after[0].n !== 0) throw new Error('Rollback verification failed');
      process.stdout.write('PASS: synthetic ticket absent after rollback.\n');
    }
    await ds.destroy();
  }
}
main().catch((error) => { process.stderr.write(`FAIL: ${error.name}\n`); process.exitCode = 1; });
