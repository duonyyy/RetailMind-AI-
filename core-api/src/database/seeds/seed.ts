import { AppDataSource } from '../data-source';
import * as argon2 from 'argon2';

export async function runSeed(): Promise<void> {
  const ds = await AppDataSource.initialize();
  console.log('[Seed] Database connected, starting seed...');

  try {
    // 1. Roles
    await ds.query(`
      INSERT INTO "roles" ("code", "name", "description", "permissions")
      VALUES 
        ('ADMIN', 'Quản Trị Viên', 'Toàn quyền quản trị hệ thống', ARRAY['catalog:write', 'inventory:write', 'hitl:approve', 'finops:view', 'admin:manage']),
        ('CUSTOMER', 'Khách Hàng', 'Người dùng mua sắm tiêu chuẩn', ARRAY['order:create', 'ticket:create', 'cart:manage'])
      ON CONFLICT ("code") DO NOTHING;
    `);

    const adminRole = (await ds.query(`SELECT id FROM "roles" WHERE "code" = 'ADMIN' LIMIT 1;`))[0];
    const customerRole = (await ds.query(`SELECT id FROM "roles" WHERE "code" = 'CUSTOMER' LIMIT 1;`))[0];

    // 2. Users with Argon2id hash
    const adminPasswordHash = await argon2.hash('Admin@2026!Secure', { type: argon2.argon2id });
    const customerPasswordHash = await argon2.hash('Customer@2026!Secure', { type: argon2.argon2id });

    await ds.query(`
      INSERT INTO "users" ("id", "role_id", "email", "password_hash", "full_name", "phone_number", "is_active")
      VALUES
        ('00000000-0000-0000-0000-000000000001', '${adminRole.id}', 'admin@retailmind.ai', '${adminPasswordHash}', 'Quản Trị Viên Hệ Thống', '0901234567', true),
        ('00000000-0000-0000-0000-000000000002', '${customerRole.id}', 'customer@mwg.vn', '${customerPasswordHash}', 'Nguyễn Văn An (Khách hàng thân thiết)', '0987654321', true)
      ON CONFLICT ("email") DO UPDATE SET "password_hash" = EXCLUDED."password_hash";
    `);

    // 3. Stores
    await ds.query(`
      INSERT INTO "stores" ("id", "code", "name", "display_address", "address", "phone_number")
      VALUES
        ('10000000-0000-0000-0000-000000000001', 'MWG_HCM_001', 'Thế Giới Di Động 136 Nguyễn Thái Học, Quận 1, TP.HCM', '136 Nguyễn Thái Học, P. Phạm Ngũ Lão, Quận 1, TP. Hồ Chí Minh', '136 Nguyễn Thái Học, P. Phạm Ngũ Lão, Quận 1, TP. Hồ Chí Minh', '1800 1060'),
        ('10000000-0000-0000-0000-000000000002', 'MWG_HN_002', 'Thế Giới Di Động 117 Thái Hà, Đống Đa, Hà Nội', '117 Thái Hà, P. Trung Liệt, Q. Đống Đa, TP. Hà Nội', '117 Thái Hà, P. Trung Liệt, Q. Đống Đa, TP. Hà Nội', '1800 1060'),
        ('10000000-0000-0000-0000-000000000003', 'MWG_DN_003', 'Điện Máy Xanh 320 đường 2 Tháng 9, Hải Châu, Đà Nẵng', '320 đường 2 Tháng 9, P. Hòa Cường Bắc, Q. Hải Châu, TP. Đà Nẵng', '320 đường 2 Tháng 9, P. Hòa Cường Bắc, Q. Hải Châu, TP. Đà Nẵng', '1800 1061')
      ON CONFLICT ("code") DO NOTHING;
    `);

    // 4. Brands
    await ds.query(`
      INSERT INTO "brands" ("id", "code", "slug", "name")
      VALUES
        ('20000000-0000-0000-0000-000000000001', 'asus', 'asus', 'Asus'),
        ('20000000-0000-0000-0000-000000000002', 'dell', 'dell', 'Dell'),
        ('20000000-0000-0000-0000-000000000003', 'lenovo', 'lenovo', 'Lenovo'),
        ('20000000-0000-0000-0000-000000000004', 'acer', 'acer', 'Acer'),
        ('20000000-0000-0000-0000-000000000005', 'hp', 'hp', 'HP'),
        ('20000000-0000-0000-0000-000000000006', 'apple', 'apple', 'Apple')
      ON CONFLICT ("slug") DO NOTHING;
    `);

    // 5. Categories
    await ds.query(`
      INSERT INTO "categories" ("id", "code", "slug", "name", "level")
      VALUES
        ('30000000-0000-0000-0000-000000000001', 'laptop-office', 'laptop-office', 'Laptop Học tập - Văn phòng', 1),
        ('30000000-0000-0000-0000-000000000002', 'laptop-business', 'laptop-business', 'Laptop Doanh nhân - Đồ họa nhẹ', 1),
        ('30000000-0000-0000-0000-000000000003', 'laptop-premium', 'laptop-premium', 'Laptop Cao Cấp - Sang Trọng', 1)
      ON CONFLICT ("slug") DO NOTHING;
    `);

    // 6. Products & Variants (6 Flagship MWG Laptops)
    await ds.query(`
      INSERT INTO "products" ("id", "brand_id", "category_id", "name", "slug", "description")
      VALUES
        ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Laptop Asus Vivobook 15 OLED A1505VA', 'asus-vivobook-15-oled', 'Màn hình OLED 2.8K 120Hz rực rỡ, RAM 16GB'),
        ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Laptop Dell Inspiron 14 5430', 'dell-inspiron-14-5430', 'Khung nhôm nguyên khối sang trọng, RAM 16GB LPDDR5'),
        ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'Laptop Lenovo ThinkBook 14 G6+ (2024)', 'lenovo-thinkbook-14-g6', 'Vi xử lý Core Ultra thế hệ mới tích hợp AI NPU'),
        ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'Laptop Acer Swift Go 14 OLED SFG14', 'acer-swift-go-14-oled', 'Trọng lượng siêu nhẹ 1.25 kg, màn OLED 90Hz'),
        ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', 'Laptop HP Pavilion 14-dv2075TU', 'hp-pavilion-14-dv2075tu', 'Thiết kế nắp nhôm mạ vàng, loa B&O'),
        ('40000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000003', 'MacBook Air 13.6 inch M2 (2022)', 'macbook-air-13-m2', 'Chip Apple M2 tối ưu điện năng, pin 18 giờ')
      ON CONFLICT ("slug") DO NOTHING;
    `);

    await ds.query(`
      INSERT INTO "variants" ("id", "product_id", "sku", "name", "price_vnd", "ram_gb", "storage_gb", "cpu_model", "gpu_model")
      VALUES
        ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'LT-ASUS-VIVO15-OLED', 'Laptop Asus Vivobook 15 OLED A1505VA', 17990000, 16, 512, 'Intel Core i5-13500H (12 nhân, 16 luồng)', 'Intel Iris Xe Graphics'),
        ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'LT-DELL-INSP14-5430', 'Laptop Dell Inspiron 14 5430', 18490000, 16, 512, 'Intel Core i5-1335U (10 nhân, 12 luồng)', 'Intel Iris Xe Graphics'),
        ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', 'LT-LENOVO-TB14-G6', 'Laptop Lenovo ThinkBook 14 G6+ (2024)', 19990000, 16, 512, 'Intel Core Ultra 5 125H (AI NPU tích hợp)', 'Intel Arc Graphics'),
        ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', 'LT-ACER-SWIFT-GO14', 'Laptop Acer Swift Go 14 OLED SFG14', 16990000, 16, 512, 'Intel Core i5-13500H', 'Intel Iris Xe'),
        ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000005', 'LT-HP-PAV14-DV2075TU', 'Laptop HP Pavilion 14-dv2075TU', 15490000, 16, 512, 'Intel Core i5-1235U', 'Intel Iris Xe'),
        ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000006', 'LT-APPLE-MBA-M2-8GB', 'MacBook Air 13.6 inch M2 (2022)', 24990000, 8, 256, 'Apple M2 (8 CPU, 8 GPU)', 'Apple M2 8-core GPU')
      ON CONFLICT ("sku") DO NOTHING;
    `);

    // 7. Inventory across 3 MWG Stores
    await ds.query(`
      INSERT INTO "inventory" ("store_id", "variant_id", "on_hand_qty", "reserved_qty")
      VALUES
        ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 12, 2),
        ('10000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 8, 1),
        ('10000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 5, 0),
        ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 10, 1),
        ('10000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 15, 3),
        ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 7, 1)
      ON CONFLICT ("store_id", "variant_id") DO NOTHING;
    `);

    // 8. Core Policies
    await ds.query(`
      INSERT INTO "policies" ("code", "title", "category", "is_active")
      VALUES
        ('POL_2026_RETURN', 'Chính Sách Đổi Trả & Bảo Hành RetailMind AI 2026', 'warranty', true),
        ('POL_2026_REFUND', 'Quy Chế Quản Trị Tài Chính & Hạn Mức Bồi Hoàn 2026', 'refund', true)
      ON CONFLICT ("code") DO NOTHING;
    `);

    console.log('[Seed] All 22-table baseline seed data applied successfully.');
  } finally {
    await ds.destroy();
  }
}

if (require.main === module) {
  runSeed().catch((err) => {
    console.error('[Seed Error]:', err);
    process.exit(1);
  });
}

