import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitRetailMindSchema1730000000000 implements MigrationInterface {
  name = 'InitRetailMindSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "unaccent";`);

    // 2. Roles
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "permissions" TEXT[] NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Users
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "role_id" UUID REFERENCES "roles"("id") ON DELETE RESTRICT,
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "password_hash" VARCHAR(255) NOT NULL,
        "full_name" VARCHAR(255) NOT NULL,
        "phone_number" VARCHAR(50),
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Brands
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "brands" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" VARCHAR(64) UNIQUE,
        "slug" VARCHAR(140) NOT NULL UNIQUE,
        "name" VARCHAR(120) NOT NULL,
        "logo_url" VARCHAR(500),
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Categories
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "parent_id" UUID REFERENCES "categories"("id") ON DELETE RESTRICT,
        "code" VARCHAR(64) UNIQUE,
        "slug" VARCHAR(140) NOT NULL UNIQUE,
        "name" VARCHAR(120) NOT NULL,
        "level" INT NOT NULL DEFAULT 1,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Products
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "products" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE RESTRICT,
        "category_id" UUID NOT NULL REFERENCES "categories"("id") ON DELETE RESTRICT,
        "name" VARCHAR(240) NOT NULL,
        "slug" VARCHAR(260) NOT NULL UNIQUE,
        "description" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Variants (SSOT Giá bán)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "variants" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "product_id" UUID NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
        "sku" VARCHAR(100) NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "price_vnd" NUMERIC(18, 0) NOT NULL,
        "ram_gb" INT,
        "storage_gb" INT,
        "cpu_model" VARCHAR(120),
        "gpu_model" VARCHAR(120),
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_variants_price_positive" CHECK ("price_vnd" >= 0)
      );
      CREATE INDEX IF NOT EXISTS "ix_variants_price_vnd" ON "variants"("price_vnd");
      CREATE INDEX IF NOT EXISTS "ix_variants_product_id" ON "variants"("product_id");
    `);

    // 8. Product Specs (Composite PK)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_specs" (
        "variant_id" UUID NOT NULL REFERENCES "variants"("id") ON DELETE RESTRICT,
        "spec_key" VARCHAR(64) NOT NULL,
        "spec_value" TEXT NOT NULL,
        "data_type" VARCHAR(32) NOT NULL DEFAULT 'string',
        PRIMARY KEY ("variant_id", "spec_key")
      );
    `);

    // 9. Stores
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stores" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "display_address" TEXT,
        "address" VARCHAR(500),
        "phone_number" VARCHAR(50),
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. Inventory (Composite PK & Anti-Oversell Checks)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory" (
        "store_id" UUID NOT NULL REFERENCES "stores"("id") ON DELETE RESTRICT,
        "variant_id" UUID NOT NULL REFERENCES "variants"("id") ON DELETE RESTRICT,
        "on_hand_qty" INT NOT NULL DEFAULT 0,
        "reserved_qty" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("store_id", "variant_id"),
        CONSTRAINT "chk_inventory_on_hand_nonnegative" CHECK ("on_hand_qty" >= 0),
        CONSTRAINT "chk_inventory_reserved_nonnegative" CHECK ("reserved_qty" >= 0),
        CONSTRAINT "chk_inventory_reserved_lte_on_hand" CHECK ("reserved_qty" <= "on_hand_qty")
      );
    `);

    // 11. Favorites (Composite PK)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "favorites" (
        "customer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "variant_id" UUID NOT NULL REFERENCES "variants"("id") ON DELETE RESTRICT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("customer_id", "variant_id")
      );
    `);

    // 12. Carts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "carts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "customer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "status" VARCHAR(32) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 13. Cart Items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cart_items" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "cart_id" UUID NOT NULL REFERENCES "carts"("id") ON DELETE CASCADE,
        "variant_id" UUID NOT NULL REFERENCES "variants"("id") ON DELETE RESTRICT,
        "quantity" INT NOT NULL DEFAULT 1,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_cart_items_cart_variant" UNIQUE ("cart_id", "variant_id"),
        CONSTRAINT "chk_cart_items_quantity_positive" CHECK ("quantity" > 0)
      );
    `);

    // 14. Idempotency Keys
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "idempotency_keys" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" VARCHAR(255) NOT NULL UNIQUE,
        "target_id" VARCHAR(255),
        "status" VARCHAR(32) NOT NULL DEFAULT 'processing',
        "response_payload" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expires_at" TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS "ix_idempotency_keys_expires_at" ON "idempotency_keys"("expires_at");
    `);

    // 15. Orders
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_no" VARCHAR(64) NOT NULL UNIQUE,
        "customer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "store_id" UUID NOT NULL REFERENCES "stores"("id") ON DELETE RESTRICT,
        "idempotency_key_id" UUID REFERENCES "idempotency_keys"("id") ON DELETE RESTRICT,
        "status" VARCHAR(32) NOT NULL DEFAULT 'confirmed',
        "total_vnd" NUMERIC(18, 0) NOT NULL,
        "confirmed_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "cancelled_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_orders_total_nonnegative" CHECK ("total_vnd" >= 0),
        CONSTRAINT "chk_orders_status_valid" CHECK ("status" IN ('pending', 'confirmed', 'placed', 'cancelled', 'completed'))
      );
      CREATE INDEX IF NOT EXISTS "ix_orders_customer_id" ON "orders"("customer_id", "created_at" DESC);
    `);

    // 16. Order Items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_items" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "variant_id" UUID NOT NULL REFERENCES "variants"("id") ON DELETE RESTRICT,
        "sku_snapshot" VARCHAR(100) NOT NULL,
        "title_snapshot" VARCHAR(255) NOT NULL,
        "unit_price_vnd" NUMERIC(18, 0) NOT NULL,
        "quantity" INT NOT NULL DEFAULT 1,
        "line_total_vnd" NUMERIC(18, 0) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_order_items_qty_positive" CHECK ("quantity" > 0),
        CONSTRAINT "chk_order_items_line_total_nonnegative" CHECK ("line_total_vnd" >= 0)
      );
    `);

    // 17. Conversations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "conversations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "customer_id" UUID NOT NULL,
        "title" VARCHAR(255) NOT NULL DEFAULT 'Cuộc trò chuyện tư vấn',
        "status" VARCHAR(32) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "ix_conversations_customer_id" ON "conversations"("customer_id");
    `);

    // 18. Messages
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversation_id" UUID NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
        "role" VARCHAR(32) NOT NULL,
        "content" TEXT NOT NULL,
        "citations" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "ix_messages_conversation_id" ON "messages"("conversation_id");
    `);

    // 19. Policies
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "policies" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" VARCHAR(64) NOT NULL UNIQUE,
        "title" VARCHAR(255) NOT NULL,
        "category" VARCHAR(64) NOT NULL DEFAULT 'warranty',
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 20. Document Versions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "document_versions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "policy_id" UUID NOT NULL REFERENCES "policies"("id") ON DELETE RESTRICT,
        "version_no" INT NOT NULL,
        "minio_object_key" VARCHAR(255) NOT NULL,
        "checksum_sha256" VARCHAR(64) NOT NULL,
        "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_document_versions_policy_version" UNIQUE ("policy_id", "version_no")
      );
    `);

    // 21. Ingestion Jobs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ingestion_jobs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "document_version_id" UUID NOT NULL REFERENCES "document_versions"("id") ON DELETE RESTRICT,
        "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
        "chunks_count" INT NOT NULL DEFAULT 0,
        "error_message" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 22. Support Tickets
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "support_tickets" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticket_code" VARCHAR(50) NOT NULL UNIQUE,
        "order_id" VARCHAR(100),
        "customer_id" VARCHAR(100) NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'OPEN',
        "priority" VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 23. Audit Events (Append-Only)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_events" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "actor_id" VARCHAR(100),
        "action" VARCHAR(64) NOT NULL,
        "entity_type" VARCHAR(64) NOT NULL,
        "entity_id" VARCHAR(120),
        "payload" JSONB,
        "ip_address" VARCHAR(64),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "ix_audit_events_created_at" ON "audit_events"("created_at" DESC);
      CREATE INDEX IF NOT EXISTS "ix_audit_events_actor_id" ON "audit_events"("actor_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_events";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "support_tickets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ingestion_jobs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "document_versions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "policies";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messages";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversations";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "idempotency_keys";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cart_items";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "carts";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "favorites";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stores";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_specs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "variants";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "brands";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles";`);
  }
}

