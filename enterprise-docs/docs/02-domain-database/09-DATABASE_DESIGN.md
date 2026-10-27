# 09 — Physical Database Architecture & Schema Specification

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/02-domain-database/09-DATABASE_DESIGN.md`  
**Căn cứ đặc tả**: `docs/database/02_logical_schema.md`, `03_physical_schema.md` & `06_constraints_indexes.md`  
**Trạng thái**: Approved for Architecture Baseline (Production 2026 Edition)  

---

## 1. Tôn Chỉ Thiết Kế Cơ Sở Dữ Liệu

1. **PostgreSQL 16+ là Nguồn Chân Lý Duy Nhất (Single Source of Truth - SSOT)**: Toàn bộ dữ liệu giao dịch, tài khoản, giá bán niêm yết, số lượng tồn kho khả dụng và phiên bản văn bản bắt buộc lưu trữ tại PostgreSQL.
2. **Kiểu dữ liệu tiền tệ nghiêm ngặt**: Toàn bộ giá tiền và tổng giá trị đơn hàng bằng VNĐ bắt buộc dùng kiểu `NUMERIC(18, 0)`. **Nghiêm cấm dùng `FLOAT` / `REAL`** để triệt tiêu hoàn toàn sai số làm tròn.
3. **Chiến lược định danh toàn cầu**: Toàn bộ các bảng nghiệp vụ sử dụng `UUIDv4` làm khóa chính (Primary Key) sinh tự động qua `gen_random_uuid()`. Các bảng quan hệ nhiều-nhiều (`favorites`, `product_specs`, `inventory`) dùng Composite Primary Key tối ưu hiệu năng.
4. **Bảo toàn lịch sử giao dịch**: Thiết lập khóa ngoại với ràng buộc `ON DELETE RESTRICT` cho toàn bộ các quan hệ danh mục và đơn hàng để chống xóa nhầm gây mồ côi dữ liệu.

---

## 2. Bảng Kiểm Kê 22 Thực Thể CSDL Phân Theo Bounded Contexts

| STT | Tên Bảng | Bounded Context | Khóa Chính (PK) | Mục Đích Lưu Trữ |
|:---:|---|---|---|---|
| 1 | `roles` | `identity` | `id` (UUID) | Danh mục vai trò (`CUSTOMER`, `ADMIN`) |
| 2 | `users` | `identity` | `id` (UUID) | Tài khoản người dùng, email, mật khẩu Argon2id |
| 3 | `brands` | `catalog` | `id` (UUID) | Thương hiệu sản phẩm (Apple, Dell, Asus...) |
| 4 | `categories` | `catalog` | `id` (UUID) | Danh mục phân cấp cây tự tham chiếu |
| 5 | `products` | `catalog` | `id` (UUID) | Sản phẩm trừu tượng |
| 6 | `variants` | `catalog` | `id` (UUID) | Biến thể cấu hình, SKU duy nhất, giá niêm yết VNĐ |
| 7 | `product_specs` | `catalog` | `(variant_id, spec_key)` | Thuộc tính cấu hình chi tiết (RAM, CPU, GPU) |
| 8 | `stores` | `inventory` | `id` (UUID) | Danh mục chi nhánh / cửa hàng demo |
| 9 | `inventory` | `inventory` | `(store_id, variant_id)` | Tồn kho vật lý và tồn kho giữ chỗ |
| 10 | `favorites` | `commerce` | `(customer_id, variant_id)` | Danh mục sản phẩm yêu thích cá nhân |
| 11 | `carts` | `commerce` | `id` (UUID) | Giỏ hàng mua sắm (1 active per customer) |
| 12 | `cart_items` | `commerce` | `(cart_id, variant_id)` | Chi tiết các mặt hàng trong giỏ |
| 13 | `orders` | `commerce` | `id` (UUID) | Đơn hàng thương mại giả lập, order_no duy nhất |
| 14 | `order_items` | `commerce` | `id` (UUID) | Snapshot bất biến giá và thông số sản phẩm lúc mua |
| 15 | `idempotency_keys` | `commerce` | `id` (UUID) | Mã khóa chống thao tác lặp (TTL 24h) |
| 16 | `conversations` | `agents` | `id` (UUID) | Phiên hội thoại với trợ lý AI LangGraph |
| 17 | `messages` | `agents` | `id` (UUID) | Tin nhắn hội thoại kèm trích dẫn văn bản |
| 18 | `policies` | `knowledge` | `id` (UUID) | Chính sách bảo hành, hậu mãi |
| 19 | `document_versions` | `knowledge` | `id` (UUID) | Lịch sử phiên bản tài liệu RAG |
| 20 | `ingestion_jobs` | `knowledge` | `id` (UUID) | Trạng thái đồng bộ embedding vector sang Qdrant |
| 21 | `support_tickets` | `support` | `id` (UUID) | Phiếu khiếu nại, hỗ trợ kỹ thuật gắn với đơn hàng |
| 22 | `audit_events` | `audit` / `core` | `id` (UUID) | Sổ cái kiểm toán Append-Only ghi vết hệ thống |

---

## 3. Đặc Tả DDL Vật Lý Đại Diện Các Cụm Thực Thể Cốt Lõi

```sql
-- Kích hoạt extension sinh UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Bảng users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_email UNIQUE (email)
);

-- Bảng variants (SSOT Giá bán)
CREATE TABLE variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price_vnd NUMERIC(18, 0) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_variants_sku UNIQUE (sku),
    CONSTRAINT chk_variants_price_positive CHECK (price_vnd >= 0)
);

-- Bảng inventory (Quản lý tồn kho)
CREATE TABLE inventory (
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE RESTRICT,
    on_hand_qty INTEGER NOT NULL DEFAULT 0,
    reserved_qty INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (store_id, variant_id),
    CONSTRAINT chk_inventory_on_hand_nonnegative CHECK (on_hand_qty >= 0),
    CONSTRAINT chk_inventory_reserved_nonnegative CHECK (reserved_qty >= 0),
    CONSTRAINT chk_inventory_reserved_lte_on_hand CHECK (reserved_qty <= on_hand_qty)
);

-- Bảng orders (Giao dịch chốt đơn giả lập)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(64) NOT NULL,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    idempotency_key_id UUID REFERENCES idempotency_keys(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    total_amount_vnd NUMERIC(18, 0) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_orders_order_no UNIQUE (order_no),
    CONSTRAINT chk_orders_total_nonnegative CHECK (total_amount_vnd >= 0),
    CONSTRAINT chk_orders_status_valid CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);
```

---

## 4. Cấu Hình Pool Kết Nối PostgreSQL TypeORM (NestJS 12+)

Hệ thống kết nối PostgreSQL 16+ qua NestJS TypeORM Module sử dụng `pg` driver (Node-Postgres) với cấu hình pool chuẩn doanh nghiệp:
* `extra.max`: 20 kết nối tối đa trong pool.
* `extra.min`: 5 kết nối thường trực.
* `extra.idleTimeoutMillis`: 30000 (30 giây giải phóng kết nối nhàn rỗi).
* `extra.connectionTimeoutMillis`: 5000 (5 giây timeout kết nối).
* `ssl`: `false` trong mạng Docker Compose nội bộ; enforce SSL có chứng chỉ CA tại môi trường Production.
