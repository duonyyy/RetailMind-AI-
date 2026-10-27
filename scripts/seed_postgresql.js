/**
 * RetailMind AI — PostgreSQL Database Migration & Seed Pipeline
 *
 * Nhiệm vụ:
 * 1. Khởi tạo cấu trúc bảng (DDL) chuẩn hóa theo ADR-007 & TypeORM Entities:
 *    - roles, users
 *    - brands, categories, products, variants
 *    - stores, inventory (hỗ trợ SELECT ... FOR UPDATE chống bán vượt tồn)
 *    - orders, order_items, carts, cart_items, support_tickets, idempotency_keys
 * 2. Nạp dữ liệu hạt giống (Seed Data):
 *    - Phân quyền RBAC: guest, customer, admin
 *    - Tài khoản mẫu (Admin & Customer)
 *    - Danh mục & Thương hiệu máy tính
 *    - 3 Chi nhánh siêu thị MWG / RetailMind
 *    - Danh mục Laptop SSOT kèm số lượng tồn kho khả dụng
 */

const { Client } = require(require('path').resolve(__dirname, '../core-api/node_modules/pg'));
const crypto = require('crypto');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || process.env.DB_USERNAME || 'retailmind_user',
  password: process.env.DB_PASSWORD || 'secure_password_change_me',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'retailmind_db',
};

async function seed() {
  console.log('='.repeat(70));
  console.log('🐘 RETAILMIND AI — POSTGRESQL MIGRATION & SEED PIPELINE');
  console.log(`Connecting to: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}...`);
  console.log('='.repeat(70));

  const client = new Client(DB_CONFIG);
  await client.connect();

  try {
    // 1. Enable UUID Extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 2. DDL Schema Definitions
    console.log('[PostgreSQL] Đang khởi tạo cấu trúc 14 bảng quan hệ...');

    await client.query(`
      -- Bảng Roles & Users
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Bảng Brands & Categories
      CREATE TABLE IF NOT EXISTS brands (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(120) NOT NULL,
        slug VARCHAR(140) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(120) NOT NULL,
        slug VARCHAR(140) UNIQUE NOT NULL,
        parent_id UUID,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Bảng Products & Variants
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        name VARCHAR(240) NOT NULL,
        slug VARCHAR(260) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS variants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        sku VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        price_vnd NUMERIC(18, 0) NOT NULL,
        ram_gb INT,
        storage_gb INT,
        cpu_model VARCHAR(120),
        gpu_model VARCHAR(120),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Bảng Stores & Inventory (Khóa bi quan phòng chống Oversell)
      CREATE TABLE IF NOT EXISTS stores (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(40) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        display_address TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory (
        store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
        on_hand_qty INT NOT NULL DEFAULT 0 CHECK (on_hand_qty >= 0),
        reserved_qty INT NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (store_id, variant_id),
        CONSTRAINT chk_inventory_available CHECK (on_hand_qty >= reserved_qty)
      );

      -- Bảng Orders & Items
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
        total_amount_vnd NUMERIC(18, 0) NOT NULL,
        shipping_address TEXT,
        phone VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE RESTRICT,
        quantity INT NOT NULL CHECK (quantity > 0),
        unit_price_vnd NUMERIC(18, 0) NOT NULL,
        total_price_vnd NUMERIC(18, 0) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Bảng Carts & Cart Items
      CREATE TABLE IF NOT EXISTS carts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cart_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
        variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
        quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (cart_id, variant_id)
      );

      -- Bảng Support Tickets & Idempotency Keys
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(40) DEFAULT 'OPEN',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key VARCHAR(255) PRIMARY KEY,
        resource_id VARCHAR(255),
        response_json JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
    `);
    console.log('✓ [PostgreSQL] DDL schema khởi tạo thành công.');

    // 3. Seed Roles
    console.log('\n[Seed] Đang nạp Roles & Users...');
    const roles = [
      { code: 'admin', name: 'Quản Trị Viên Sàn', description: 'Toàn quyền quản trị danh mục, tồn kho và hệ thống' },
      { code: 'customer', name: 'Khách Hàng Thành Viên', description: 'Người mua sắm có tài khoản định danh' },
      { code: 'guest', name: 'Khách Vãng Lai', description: 'Người dùng ẩn danh duyệt sản phẩm' },
    ];

    const roleMap = {};
    for (const r of roles) {
      const res = await client.query(
        `INSERT INTO roles (code, name, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, code;`,
        [r.code, r.name, r.description]
      );
      roleMap[r.code] = res.rows[0].id;
    }

    // Seed Users (Pass: RetailMind@2026)
    // SHA256 fallback hash for demonstration
    const passwordHash = crypto.createHash('sha256').update('RetailMind@2026').digest('hex');
    const users = [
      { email: 'admin@retailmind.vn', role: 'admin', full_name: 'Quản Trị Viên RetailMind', phone: '0901888999' },
      { email: 'customer@retailmind.vn', role: 'customer', full_name: 'Nguyễn Văn Khách Hàng', phone: '0909123456' },
    ];

    for (const u of users) {
      await client.query(
        `INSERT INTO users (role_id, email, password_hash, full_name, phone)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name;`,
        [roleMap[u.role], u.email, passwordHash, u.full_name, u.phone]
      );
    }

    // 4. Seed Brands
    console.log('[Seed] Đang nạp Thương Hiệu (Brands)...');
    const brands = [
      { name: 'Asus', slug: 'asus' },
      { name: 'Dell', slug: 'dell' },
      { name: 'Lenovo', slug: 'lenovo' },
      { name: 'Apple', slug: 'apple' },
      { name: 'HP', slug: 'hp' },
      { name: 'Acer', slug: 'acer' },
    ];
    const brandMap = {};
    for (const b of brands) {
      const res = await client.query(
        `INSERT INTO brands (name, slug)
         VALUES ($1, $2)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, slug;`,
        [b.name, b.slug]
      );
      brandMap[b.slug] = res.rows[0].id;
    }

    // 5. Seed Categories
    console.log('[Seed] Đang nạp Danh Mục (Categories)...');
    const categories = [
      { name: 'Laptop', slug: 'laptop' },
      { name: 'Laptop Học tập - Văn phòng', slug: 'laptop-hoc-tap-van-phong' },
      { name: 'Laptop Doanh nhân - Đồ họa', slug: 'laptop-doanh-nhan' },
      { name: 'Laptop Cao Cấp - Sang Trọng', slug: 'laptop-cao-cap' },
    ];
    const catMap = {};
    for (const c of categories) {
      const res = await client.query(
        `INSERT INTO categories (name, slug)
         VALUES ($1, $2)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, slug;`,
        [c.name, c.slug]
      );
      catMap[c.slug] = res.rows[0].id;
    }

    // 6. Seed Stores
    console.log('[Seed] Đang nạp Siêu Thị (Stores)...');
    const stores = [
      { code: 'STORE_HCM_001', name: 'Điện máy RetailMind Quận 1', display_address: '130 Trần Hưng Đạo, P. Bến Thành, Quận 1, TP.HCM' },
      { code: 'STORE_HN_001', name: 'Điện máy RetailMind Cầu Giấy', display_address: '280 Cầu Giấy, P. Quan Hoa, Q. Cầu Giấy, Hà Nội' },
      { code: 'STORE_DN_001', name: 'Điện máy RetailMind Hải Châu', display_address: '45 Nguyễn Văn Linh, P. Nam Dương, Q. Hải Châu, Đà Nẵng' },
    ];
    const storeMap = {};
    for (const s of stores) {
      const res = await client.query(
        `INSERT INTO stores (code, name, display_address)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, code;`,
        [s.code, s.name, s.display_address]
      );
      storeMap[s.code] = res.rows[0].id;
    }

    // 7. Seed Products & Variants (MWG Baseline)
    console.log('[Seed] Đang nạp Sản Phẩm & Biến Thể Laptop SSOT...');
    const laptops = [
      {
        brand: 'asus',
        category: 'laptop-hoc-tap-van-phong',
        pName: 'Laptop Asus Vivobook 15 OLED A1505VA',
        pSlug: 'laptop-asus-vivobook-15-oled-a1505va',
        sku: 'LT-ASUS-VIVO15-OLED',
        vName: 'Asus Vivobook 15 OLED (Core i5 13500H, RAM 16GB, SSD 512GB)',
        price: '17990000',
        ram: 16,
        storage: 512,
        cpu: 'Intel Core i5-13500H',
        gpu: 'Intel Iris Xe',
      },
      {
        brand: 'dell',
        category: 'laptop-hoc-tap-van-phong',
        pName: 'Laptop Dell Inspiron 14 5430',
        pSlug: 'laptop-dell-inspiron-14-5430',
        sku: 'LT-DELL-INSP14-5430',
        vName: 'Dell Inspiron 14 5430 (Core i5 1335U, RAM 16GB, SSD 512GB)',
        price: '18490000',
        ram: 16,
        storage: 512,
        cpu: 'Intel Core i5-1335U',
        gpu: 'Intel Iris Xe',
      },
      {
        brand: 'lenovo',
        category: 'laptop-doanh-nhan',
        pName: 'Laptop Lenovo ThinkBook 14 G6+',
        pSlug: 'laptop-lenovo-thinkbook-14-g6',
        sku: 'LT-LENOVO-TB14-G6',
        vName: 'Lenovo ThinkBook 14 G6+ (Core Ultra 5 125H, RAM 16GB, SSD 512GB)',
        price: '19990000',
        ram: 16,
        storage: 512,
        cpu: 'Intel Core Ultra 5 125H',
        gpu: 'Intel Arc Graphics',
      },
      {
        brand: 'acer',
        category: 'laptop-hoc-tap-van-phong',
        pName: 'Laptop Acer Swift Go 14 OLED',
        pSlug: 'laptop-acer-swift-go-14-oled',
        sku: 'LT-ACER-SWIFT-GO14',
        vName: 'Acer Swift Go 14 (Core i5 13500H, RAM 16GB, SSD 512GB)',
        price: '16990000',
        ram: 16,
        storage: 512,
        cpu: 'Intel Core i5-13500H',
        gpu: 'Intel Iris Xe',
      },
      {
        brand: 'hp',
        category: 'laptop-hoc-tap-van-phong',
        pName: 'Laptop HP Pavilion 14-dv2075TU',
        pSlug: 'laptop-hp-pavilion-14-dv2075tu',
        sku: 'LT-HP-PAV14-DV2075TU',
        vName: 'HP Pavilion 14 (Core i5 1235U, RAM 16GB, SSD 512GB)',
        price: '15490000',
        ram: 16,
        storage: 512,
        cpu: 'Intel Core i5-1235U',
        gpu: 'Intel Iris Xe',
      },
      {
        brand: 'apple',
        category: 'laptop-cao-cap',
        pName: 'MacBook Air 13.6 inch M2 (2022)',
        pSlug: 'macbook-air-13-6-inch-m2-2022',
        sku: 'LT-APPLE-MBA-M2-8GB',
        vName: 'MacBook Air M2 2022 (Apple M2, RAM 8GB, SSD 256GB)',
        price: '24990000',
        ram: 8,
        storage: 256,
        cpu: 'Apple M2 8-Core',
        gpu: 'Apple M2 GPU',
      },
    ];

    for (const item of laptops) {
      // Product
      const pRes = await client.query(
        `INSERT INTO products (brand_id, category_id, name, slug)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id;`,
        [brandMap[item.brand], catMap[item.category], item.pName, item.pSlug]
      );
      const productId = pRes.rows[0].id;

      // Variant
      const vRes = await client.query(
        `INSERT INTO variants (product_id, sku, name, price_vnd, ram_gb, storage_gb, cpu_model, gpu_model)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (sku) DO UPDATE SET price_vnd = EXCLUDED.price_vnd
         RETURNING id;`,
        [productId, item.sku, item.vName, item.price, item.ram, item.storage, item.cpu, item.gpu]
      );
      const variantId = vRes.rows[0].id;

      // Seed Inventory across all 3 stores
      for (const storeCode of Object.keys(storeMap)) {
        const storeId = storeMap[storeCode];
        await client.query(
          `INSERT INTO inventory (store_id, variant_id, on_hand_qty, reserved_qty)
           VALUES ($1, $2, 45, 0)
           ON CONFLICT (store_id, variant_id) DO UPDATE SET on_hand_qty = 45, reserved_qty = 0;`,
          [storeId, variantId]
        );
      }
    }

    console.log('✓ [Seed] Đã nạp thành công toàn bộ Products, Variants & Tồn kho tại các siêu thị.');

    // 8. Thống kê kết quả
    const countRes = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM roles) AS roles_count,
        (SELECT COUNT(*) FROM users) AS users_count,
        (SELECT COUNT(*) FROM brands) AS brands_count,
        (SELECT COUNT(*) FROM categories) AS categories_count,
        (SELECT COUNT(*) FROM products) AS products_count,
        (SELECT COUNT(*) FROM variants) AS variants_count,
        (SELECT COUNT(*) FROM stores) AS stores_count,
        (SELECT COUNT(*) FROM inventory) AS inventory_count;
    `);

    console.log('\n' + '='.repeat(70));
    console.log('🎉 KHỞI TẠO & SEED POSTGRESQL THÀNH CÔNG RỰC RỠ!');
    console.log('='.repeat(70));
    console.table(countRes.rows[0]);
    console.log('Tài khoản mẫu đã tạo:');
    console.log('  • Admin   : admin@retailmind.vn    | Pass: RetailMind@2026');
    console.log('  • Customer: customer@retailmind.vn | Pass: RetailMind@2026');
    console.log('='.repeat(70));
  } catch (err) {
    console.error('❌ LỖI TRONG QUÁ TRÌNH SEED POSTGRESQL:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();

