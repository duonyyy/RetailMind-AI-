# 10 — Entity Relationship Diagram (ERD) Specification

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/02-domain-database/10-ERD.md`  
**Căn cứ đặc tả**: `docs/database/04_erd.md` & `docs/database/02_logical_schema.md`  
**Trạng thái**: Approved for Architecture Baseline (Production 2026 Edition)  

---

## 1. Sơ Đồ Thực Thể Liên Kết Tổng Thể (System-Wide Mermaid ERD)

Toàn cảnh quan hệ liên kết giữa 22 thực thể cốt lõi trong cơ sở dữ liệu PostgreSQL 16+:

```mermaid
erDiagram
    %% Identity Domain
    roles ||--o{ users : "assigns"
    
    %% Catalog Domain
    brands ||--o{ products : "manufactures"
    categories ||--o{ products : "categorizes"
    categories ||--o{ categories : "sub_category_of"
    products ||--|{ variants : "has"
    variants ||--|{ product_specs : "defined_by"
    
    %% Inventory Domain
    stores ||--o{ inventory : "stocks"
    variants ||--o{ inventory : "stocked_at"
    
    %% Commerce Domain
    users ||--o{ favorites : "marks"
    variants ||--o{ favorites : "favorited_by"
    users ||--o{ carts : "owns"
    carts ||--o{ cart_items : "contains"
    variants ||--o{ cart_items : "referenced_in"
    users ||--o{ orders : "places"
    stores ||--o{ orders : "fulfilled_at"
    idempotency_keys ||--o{ orders : "guards"
    orders ||--|{ order_items : "includes"
    variants ||--o{ order_items : "bought_as"
    
    %% Agents Domain
    users ||--o{ conversations : "participates"
    conversations ||--|{ messages : "contains"
    
    %% Knowledge Domain
    policies ||--|{ document_versions : "versions"
    document_versions ||--o{ ingestion_jobs : "triggers"
    
    %% Support Domain
    users ||--o{ support_tickets : "files"
    orders ||--o{ support_tickets : "concerns"

    %% Entity Attributes Definition
    roles {
        uuid id PK
        string name UK
        string description
        timestamptz created_at
    }

    users {
        uuid id PK
        uuid role_id FK
        string email UK
        string password_hash
        string full_name
        string phone_number
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    products {
        uuid id PK
        uuid brand_id FK
        uuid category_id FK
        string name
        string slug UK
        string description
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    variants {
        uuid id PK
        uuid product_id FK
        string sku UK
        string name
        numeric price_vnd
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    inventory {
        uuid store_id PK,FK
        uuid variant_id PK,FK
        int on_hand_qty
        int reserved_qty
        timestamptz updated_at
    }

    orders {
        uuid id PK
        string order_no UK
        uuid customer_id FK
        uuid store_id FK
        uuid idempotency_key_id FK
        string status
        numeric total_amount_vnd
        timestamptz created_at
        timestamptz updated_at
    }

    order_items {
        uuid id PK
        uuid order_id FK
        uuid variant_id FK
        int quantity
        numeric unit_price_vnd
        numeric subtotal_vnd
        jsonb specs_snapshot
    }

    document_versions {
        uuid id PK
        uuid policy_id FK
        int version_no
        string status
        text content_raw
        timestamptz published_at
    }
```

---

## 2. Ranh Giới Phân Tách Dữ Liệu: PostgreSQL vs Qdrant

Hệ thống phân định nghiêm ngặt vai trò giữa cơ sở dữ liệu quan hệ và cơ sở dữ liệu vector:

```mermaid
flowchart LR
    %% ==========================================
    %% COLOR PALETTE & STYLES
    %% ==========================================
    classDef pgStyle fill:#1E1B4B,stroke:#EC4899,stroke-width:2.5px,color:#FCE7F3,rx:10,ry:10
    classDef qdStyle fill:#0F172A,stroke:#8B5CF6,stroke-width:2px,color:#EDE9FE,rx:10,ry:10
    classDef itemStyle fill:#1E293B,stroke:#94A3B8,stroke-width:1px,color:#F8FAFC,rx:6,ry:6

    subgraph PG_SSOT ["🏛️ POSTGRESQL 16+ (CHÂN LÝ DUY NHẤT — SSOT)"]
        direction TB
        PG_Box["• Bảng policies: Quyền truy cập & Metadata<br/>• Bảng document_versions: Văn bản gốc & Trạng thái Published<br/>• Bảng variants & inventory: Giá tiền NUMERIC & Tồn kho"]:::pgStyle
    end

    subgraph QDRANT_INDEX ["🔍 QDRANT VECTOR DB (CHỈ MỤC TÌM KIẾM THỨ CẤP)"]
        direction TB
        QD_Box["• Collection retail_policies: Vector Embeddings (1536-dim)<br/>• Payload: chunk_id, doc_version_id, policy_id<br/>• Metadata Filter: visibility = 'public'"]:::qdStyle
    end

    PG_Box ==>|"1. Ingestion: Chunking & Embedding Vector"| QD_Box
    QD_Box -.->|"2. Two-Way Verification: Xác minh status == 'published'"| PG_Box
```

> [!CAUTION]
> **Quy Tắc RAG Bất Biến**: Qdrant không bao giờ được phép quyết định giá, khuyến mãi hay tồn kho. Mọi thông tin tư vấn chính sách của AI Agent phải trích dẫn kèm `document_version_id` đã được xác minh trạng thái `published` tại PostgreSQL.
