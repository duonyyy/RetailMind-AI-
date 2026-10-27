# 17 — Frontend Architecture & UI/UX Design Specification

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Phiên bản**: Production 2026 Edition  
**Tài liệu**: `enterprise-docs/docs/06-frontend/17-FRONTEND_DESIGN.md`  
**Công nghệ**: Next.js 16+ (App Router), React 19, TypeScript Strict, TailwindCSS, Server Actions, TanStack React Query  
**Kiến trúc cốt lõi**: **Feature-Based Architecture (Kiến trúc phân hệ theo Tính năng)** kết hợp **Dual-Shell UI** & **BFF Reverse Proxy**  
**Căn cứ kiến trúc**: `AGENTS.md`, `ADR-007` (Polyglot Stack) & `ADR-009` (BFF Reverse Proxy & Clean Architecture)  
**Trạng thái**: Approved for Architecture Baseline (Production 2026 Edition)  

---

## 1. TRIẾT LÝ THIẾT KẾ & KIẾN TRÚC KHUNG VỎ KÉP (DUAL-SHELL ARCHITECTURE)

Giao diện người dùng của **RetailMind AI** được phân chia thành **2 Shell độc lập**, tối ưu hóa trải nghiệm khách hàng và hiệu năng vận hành của quản trị viên:

```mermaid
flowchart TB
    %% ==========================================
    %% DUAL-SHELL FRONTEND PALETTE
    %% ==========================================
    classDef appRoot fill:#0F172A,stroke:#6366F1,stroke-width:2.5px,color:#FFFFFF,rx:10,ry:10
    classDef commerceShell fill:#064E3B,stroke:#10B981,stroke-width:2px,color:#D1FAE5,rx:8,ry:8
    classDef adminShell fill:#3B0764,stroke:#EC4899,stroke-width:2px,color:#FCE7F3,rx:8,ry:8
    classDef componentStyle fill:#1E293B,stroke:#38BDF8,stroke-width:1.5px,color:#F8FAFC,rx:6,ry:6

    App["💻 RetailMind AI Web Client (Next.js 16+ App Router • SSR • React 19)"]:::appRoot

    subgraph Shell1 ["🛍️ COMMERCE SHELL (KHÁCH VÃNG LAI & KHÁCH MUA HÀNG)"]
        direction TB
        Nav1["Top Navigation Bar<br/>• Thanh tìm kiếm tiếng Việt tức thời (unaccent)<br/>• Bộ lọc cấu hình / RAM / GPU<br/>• Giỏ hàng Drawer mini & Badge số lượng"]:::componentStyle
        Main1["Catalog View & Comparison (SSR)<br/>• Lưới Laptop thông minh (Server Component)<br/>• Modal so sánh đối đầu 4 máy đa thông số<br/>• Checkout Preview 10m (Khóa bi quan CSDL)"]:::componentStyle
        ChatWidget["AI Floating Advisor (Client Component)<br/>• SSE Streaming Token tương tác tức thì<br/>• Thẻ sản phẩm & Trích dẫn chính sách nhúng"]:::commerceShell
    end

    subgraph Shell2 ["⚙️ ADMIN OPS SHELL (QUẢN TRỊ VIÊN HỆ THỐNG)"]
        direction TB
        Nav2["Admin Navigation Sidebar<br/>• Quản lý danh mục & biến thể Laptop<br/>• Kiểm soát ma trận tồn kho chi nhánh<br/>• Upload & Xuất bản tri thức RAG (NĐ 30)<br/>• Xử lý phiếu khiếu nại (Tickets) & Sổ cái"]:::componentStyle
        Main2["Admin Workspaces & Tables<br/>• Bảng quản trị CRUD & khóa kho bi quan<br/>• Form tải Ingestion băm SHA-256<br/>• Sổ cái kiểm toán Hash Chain Audit Ledger"]:::adminShell
    end

    App ==>|Guest & Customer| Shell1
    App ==>|Admin Role (Bảo vệ bởi Next.js Middleware Guard)| Shell2
```

---

## 2. CẤU TRÚC PHÂN HỆ THEO TÍNH NĂNG (FEATURE-BASED ARCHITECTURE)

Khắc phục hoàn toàn nhược điểm của mô hình phân chia theo loại file kỹ thuật cũ (`/components`, `/hooks`, `/services` riêng rẽ khiến mã nguồn bị phân tán), **RetailMind AI áp dụng triệt để Feature-Based Architecture**:

* Mỗi tính năng nghiệp vụ là một phân hệ khép kín (self-contained) chứa trọn vẹn: UI Components, Server Actions/Fetchers, Custom Hooks, và Types của riêng nó.
* Thư mục `src/components/` chỉ chứa các UI Primitives dùng chung trung lập (Button, Modal, Input, ScreenLoading, ScreenError, Tag, CurrencyText).

```text
web-client/src/
├── app/                           # Next.js App Router (Layouts, Route Groups, BFF Proxy)
│   ├── (auth)/                    # Route Group Auth: /login, /register, /forgot-password
│   ├── (commerce)/                # Route Group Khách hàng: /, /catalog, /cart, /checkout
│   ├── (admin)/                   # Route Group Quản trị: /admin/inventory, /admin/documents
│   ├── api/
│   │   └── proxy/[...path]/       # BFF Reverse Proxy trung gian kết nối Backend & Agent
│   │       └── route.ts           # Gắn token HttpOnly, stream SSE duplex: 'half'
│   ├── layout.tsx                 # Root layout & Theme/Query Providers
│   └── page.tsx                   # Trang chủ tích hợp điều hướng 4 Tab nghiệp vụ
│
├── features/                      # 📁 FEATURE-BASED ARCHITECTURE (PHÂN HỆ NGHIỆP VỤ ĐỘC LẬP)
│   ├── advisor/                   # Feature: Trợ lý tư vấn AI Shopping Advisor
│   │   ├── components/            # ChatWidget, MessageBubble, CitationCard, StreamingIndicator
│   │   ├── hooks/                 # useAgentChat.ts, useSSEStream.ts
│   │   ├── services/              # advisor.action.ts (Gửi prompt, đánh giá phản hồi)
│   │   └── types/                 # ChatMessage, CitationItem, SSEStreamPayload
│   │
│   ├── catalog/                   # Feature: Danh mục Laptop & So sánh cấu hình
│   │   ├── components/            # LaptopCard, ComparisonModal, SpecFilterSidebar, SpecProgressBar
│   │   ├── services/              # catalog.get.ts, compare.action.ts
│   │   └── types/                 # LaptopProduct, SpecMatrix, CatalogFilterParams
│   │
│   ├── checkout/                  # Feature: Giỏ hàng & Chốt đơn hàng giả lập
│   │   ├── components/            # CartDrawer, PreviewTokenCountdown, OrderReviewForm
│   │   ├── services/              # order.action.ts, preview-token.get.ts
│   │   └── types/                 # CartItem, OrderPreviewResponse, ConfirmOrderPayload
│   │
│   ├── admin-inventory/           # Feature: Quản trị ma trận tồn kho chi nhánh
│   │   ├── components/            # StockMatrixTable, BranchSelector, LockHoldModal
│   │   ├── services/              # inventory.action.ts, inventory.get.ts
│   │   └── types/                 # BranchInventory, StockLockRequest
│   │
│   └── admin-ingestion/           # Feature: Upload tài liệu & Quản lý tri thức RAG
│       ├── components/            # DocumentUploader, Sha256Verifier, ChunkPreviewTable
│       ├── services/              # ingestion.action.ts, ingestion-status.get.ts
│       └── types/                 # IngestionJob, ChunkItem
│
├── components/                    # 📁 UI COMPONENTS NGUYÊN TỬ & DÙNG CHUNG (AGNOSTIC)
│   ├── ui/                        # Button, Input, Modal, Drawer, Table, Badge, Toast
│   ├── commons/                   # ScreenLoading, ScreenEmpty, ScreenError, Logo
│   ├── tags/                      # OrderStatusTag, InventoryStatusTag, IngestionStatusTag
│   └── texts/                     # CurrencyText (Định dạng VNĐ không dùng float)
│
├── core/                          # 📁 HẠ TẦNG TRUNG TÂM (CORE INFRASTRUCTURE)
│   ├── auth/                      # NextAuth session handler, cookie readers, token rotation
│   ├── providers/                 # AppProvider, QueryProvider, ToastProvider
│   └── resources/                 # admin-resources.ts, customer-resources.ts, guest-resources.ts
│
├── lib/                           # 📁 THƯ VIỆN TIỆN ÍCH DÙNG CHUNG
│   ├── api-client.ts              # Fetcher apiFetch & ServerResponseDto chuẩn hóa
│   ├── rbac.ts                    # Ma trận phân quyền UI access control
│   └── utils.ts                   # cn (clsx + twMerge), formatCurrency, sleep
│
└── types/                         # TypeScript DTOs & Interfaces toàn hệ thống
```

---

## 3. CÂY KHAI BÁO TÀI NGUYÊN THEO PERSONA (`src/core/resources/`)

Tách biệt cấu trúc tài nguyên điều hướng của 3 Personas (`Admin`, `Customer`, `Guest`), cho phép cấu hình tập trung các route, tiêu đề, icon và vai trò được phép truy cập:

```typescript
// src/core/resources/admin-resources.ts
export interface ResourceDefinition {
  name: string;
  identifier: string;
  list?: string;
  create?: string;
  edit?: string;
  show?: string;
  meta: {
    label: string;
    icon?: string;
    roles: ('admin' | 'customer' | 'guest')[];
    parent?: string;
  };
}

export const adminResources: ResourceDefinition[] = [
  {
    name: 'admin-dashboard',
    identifier: 'admin.dashboard',
    list: '/admin/overview',
    meta: { label: 'Tổng quan vận hành', icon: 'LayoutDashboard', roles: ['admin'] },
  },
  {
    name: 'admin-catalog',
    identifier: 'admin.catalog',
    list: '/admin/products',
    create: '/admin/products/new',
    show: '/admin/products/:id',
    meta: { label: 'Danh mục Laptop & Cấu hình', icon: 'Laptop', roles: ['admin'] },
  },
  {
    name: 'admin-inventory',
    identifier: 'admin.inventory',
    list: '/admin/inventory',
    meta: { label: 'Ma trận Tồn kho chi nhánh', icon: 'Boxes', roles: ['admin'] },
  },
  {
    name: 'admin-ingestion',
    identifier: 'admin.ingestion',
    list: '/admin/documents',
    create: '/admin/documents/upload',
    meta: { label: 'Tri thức RAG (Nghị định 30)', icon: 'FileText', roles: ['admin'] },
  },
  {
    name: 'admin-audit',
    identifier: 'admin.audit',
    list: '/admin/audit-logs',
    meta: { label: 'Sổ cái kiểm toán Hash Chain', icon: 'ShieldCheck', roles: ['admin'] },
  },
];
```

---

## 4. MÔ HÌNH BFF REVERSE PROXY VỚI DUPLEX STREAMING (`/api/proxy/[...path]`)

Nhằm bảo vệ tuyệt đối Access Token (loại bỏ hoàn toàn việc lưu JWT trong `localStorage` dễ bị tấn công XSS) và tối ưu hóa bộ nhớ khi truyền nhận luồng dữ liệu lớn:

```typescript
// web-client/src/app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001';
const AGENT_URL = process.env.AGENT_INTERNAL_URL || 'http://localhost:8000';

export async function catchAll(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const cookieStore = cookies();
  const token = cookieStore.get('retailmind_access_token')?.value;

  // 1. Phân luồng thông minh: Luồng hội thoại hướng về Agent, nghiệp vụ khác hướng về NestJS Core
  const targetBase = path.startsWith('conversations') ? AGENT_URL : BACKEND_URL;
  const { searchParams } = new URL(req.url);
  const targetUrl = `${targetBase}/api/v1/${path}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  // 2. Whitelist Headers: Chỉ forward các headers cần thiết để tránh xung đột
  const forwardedHeaders = new Headers();
  const whitelist = ['content-type', 'accept', 'accept-language', 'x-trace-id'];
  whitelist.forEach((h) => {
    const val = req.headers.get(h);
    if (val) forwardedHeaders.set(h, val);
  });

  // 3. Tự động gắn Bearer Token từ Server Session Cookie an toàn
  if (token) {
    forwardedHeaders.set('Authorization', `Bearer ${token}`);
  }

  try {
    // 4. Stream trực tiếp với duplex: 'half' tối ưu hóa RAM cho SSE và tệp tin lớn
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardedHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      // @ts-expect-error Node fetch streaming duplex requirement
      duplex: 'half',
      cache: 'no-store',
    });

    // 5. Chuẩn hóa Response và phơi header phân trang
    const nextResponse = new NextResponse(response.body, {
      status: response.status,
      headers: response.headers,
    });

    const totalCount = response.headers.get('x-total-count');
    if (totalCount) {
      nextResponse.headers.set('x-total-count', totalCount);
      nextResponse.headers.set('Access-Control-Expose-Headers', 'x-total-count');
    }

    return nextResponse;
  } catch (error) {
    console.error('[BFF Proxy Error]:', error);
    return NextResponse.json({ error: 'Dịch vụ phía sau tạm thời không phản hồi' }, { status: 502 });
  }
}

export const GET = catchAll;
export const POST = catchAll;
export const PUT = catchAll;
export const PATCH = catchAll;
export const DELETE = catchAll;
```

---

## 5. PHÂN TÁCH RẠCH RÒI QUERIES (`.get.ts`) & SERVER ACTIONS (`.action.ts`)

Quy ước phân tách rõ rệt giữa thao tác đọc (Data Queries) và thao tác ghi (Mutations):

### 5.1. Data Queries (`catalog.get.ts`)
```typescript
// web-client/src/features/catalog/services/catalog.get.ts
import { apiFetch } from '@/lib/api-client';
import { LaptopProduct, CatalogFilterParams } from '../types';

export async function getLaptopCatalog(params: CatalogFilterParams) {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch<LaptopProduct[]>(`products?${query}`, {
    method: 'GET',
    next: { tags: ['catalog'], revalidate: 300 }, // Cache 5 phút ở tầng SSR
  });
}
```

### 5.2. Server Actions (`order.action.ts`)
```typescript
// web-client/src/features/checkout/services/order.action.ts
'use server';

import { apiFetch } from '@/lib/api-client';
import { revalidateTag } from 'next/cache';

export async function confirmOrderAction(previewToken: string, storeId: string) {
  const res = await apiFetch<{ orderId: string; status: string }>('orders/confirm', {
    method: 'POST',
    body: JSON.stringify({ preview_token: previewToken, store_id: storeId }),
  });

  if (res.success) {
    // Làm mới cache tồn kho và đơn hàng ngay lập tức
    revalidateTag('inventory');
    revalidateTag('orders');
  }
  return res;
}
```

---

## 6. BỘ CUNG CẤP KIỂM SOÁT QUYỀN ĐỘNG (DYNAMIC UI RBAC)

Hệ thống bảo vệ giao diện đa tầng, kết hợp Middleware Guard với Component điều kiện hóa:

```tsx
// src/components/commons/CanAccess.tsx
interface CanAccessProps {
  userRole?: 'admin' | 'customer' | 'guest';
  requiredRoles: ('admin' | 'customer' | 'guest')[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function CanAccess({ userRole = 'guest', requiredRoles, children, fallback = null }: CanAccessProps) {
  const isAllowed = requiredRoles.includes(userRole);
  if (!isAllowed) return <>{fallback}</>;
  return <>{children}</>;
}
```

**Sử dụng trên giao diện:**
```tsx
<CanAccess userRole={user.role} requiredRoles={['admin']}>
  <Button onClick={handleAdjustInventory} variant="destructive">
    Khóa tồn kho khẩn cấp
  </Button>
</CanAccess>
```

---

## 7. BỘ MÀN HÌNH TRẠNG THÁI UX & THẺ TRẠNG THÁI NGHIỆP VỤ

### 7.1. Màn hình trạng thái dùng chung (`src/components/commons/`)
* **`ScreenLoading`**: Hiển thị Skeleton và thanh phát quang Cyber-pulse trong khi tải dữ liệu SSR/CSR.
* **`ScreenEmpty`**: Hiển thị minh họa tinh tế khi danh sách sản phẩm hoặc giỏ hàng trống, kèm nút gợi ý hành động.
* **`ScreenError`**: Bắt lỗi render, hiển thị mã lỗi và nút "Thử lại kết nối", ngăn chặn việc làm trắng trang.

### 7.2. Thẻ trạng thái nghiệp vụ chuẩn hóa (`src/components/tags/`)
* **`OrderStatusTag`**: 
  - `placed`: Badge xanh dương ánh bạc.
  - `confirmed`: Badge xanh ngọc lục bảo (`--accent-emerald`).
  - `cancelled`: Badge đỏ ruby sang trọng.
* **`InventoryStatusTag`**: 
  - `in_stock`: "Còn hàng (> 5 cái)" - Màu xanh lá dịu.
  - `low_stock`: "Sắp hết hàng (1-3 cái)" - Màu hổ phách chớp nháy cảnh báo.
  - `out_of_stock`: "Tạm hết hàng" - Màu xám chì khóa nút mua.
* **`CurrencyText` (`src/components/texts/CurrencyText.tsx`)**:
  - Nhận chuỗi `string` tiền tệ (ví dụ: `"24990000"`), format chuẩn VNĐ (`24.990.000 ₫`) bằng hàm thuần số học, triệt tiêu hoàn toàn lỗi sai số làm tròn số thực.

---

## 8. QUẢN LÝ LUỒNG STREAMING SERVER-SENT EVENTS (SSE CLIENT)

Khung chat tư vấn trí tuệ nhân tạo nhận dòng token theo thời gian thực kết hợp trích dẫn thẻ căn cứ chính sách bảo hành:

```typescript
// web-client/src/features/advisor/hooks/useAgentChat.ts
export function useAgentChat(conversationId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async (userPrompt: string) => {
    setIsStreaming(true);
    const response = await fetch(`/api/proxy/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userPrompt }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (reader) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      // Xử lý các sự kiện SSE: token, tool_call, citation, done
      handleSSEChunk(chunk);
    }
    setIsStreaming(false);
  };

  return { messages, sendMessage, isStreaming };
}
```

---

## 9. ĐA NGÔN NGỮ SONG NGỮ CHUẨN HÓA (`next-intl` i18n)

Để phục vụ `UC10` (Multilingual Search & Query) và định hướng mở rộng thị trường:
* Thư mục từ điển: `src/i18n/messages/vi.json` và `src/i18n/messages/en.json`.
* Tự động phát hiện ngôn ngữ qua header `Accept-Language` tại BFF Proxy và hỗ trợ chuyển đổi giao diện tức thì không cần reload trang.

---

## 10. MA TRẬN ÁP DỤNG CHO 12 USE CASES CỦA RETAILMIND AI

| Use Case | Mô Tả Nghiệp Vụ | Phân Hệ Frontend (Feature) | Thành Phần & Kỹ Thuật Đảm Nhiệm |
|---|---|---|---|
| `UC01` | Semantic Search & Discovery | `features/catalog/` | Thanh tìm kiếm unaccent + Server Component SSR Grid |
| `UC02` | Comparative Product Reasoning | `features/catalog/` | `ComparisonModal`: Bảng đối đầu 4 laptop, thanh SpecProgress |
| `UC03` | Real-time Inventory Verification | `features/catalog/` & `checkout/` | `InventoryStatusTag`: Kiểm tra tồn kho khả dụng thời gian thực |
| `UC04` | Transaction & Order Finalization | `features/checkout/` | `PreviewTokenCountdown`: Đếm ngược 10m + Server Action chốt đơn |
| `UC05` | Post-Purchase Support & Inquiries | `features/advisor/` | AI SSE Streaming tra cứu đơn hàng theo `order_no` và SĐT |
| `UC06` | Sales Reporting & Analysis | `features/admin-audit/` | Dashboard Recharts hiển thị doanh số & biến động giá |
| `UC07` | Dynamic Promotions & Rules | `features/checkout/` | `VoucherInputBox`: Áp dụng mã giảm giá và tính toán server-side |
| `UC08` | Knowledge Ingestion (Decree 30) | `features/admin-ingestion/` | `DocumentUploader`: Băm SHA-256 tệp PDF trước khi upload |
| `UC09` | Out-of-Stock Predictive Alerts | `features/admin-inventory/` | Cảnh báo tồn kho dưới ngưỡng an toàn với badge hổ phách |
| `UC10` | Multilingual Search & Query | `src/i18n/` | Tích hợp song ngữ Vi/En qua `next-intl` |
| `UC11` | Audit Trail & Ledger Logging | `features/admin-audit/` | Bảng duyệt chuỗi băm Hash Chain với trạng thái nguyên vẹn |
| `UC12` | Feedback & Self-Correction | `features/advisor/` | Nút Like/Dislike phản hồi trực tiếp vào hàng đợi BullMQ |

---

## 11. DANH MỤC 27 MÀN HÌNH CHUẨN THƯƠNG MẠI ĐIỆN TỬ (SCREEN CATALOG TRACEABILITY)

Hệ sinh thái giao diện hoàn chỉnh của **RetailMind AI** được đặc tả chi tiết tại [`SCREEN_SPECIFICATIONS.md`](SCREEN_SPECIFICATIONS.md) và sơ đồ khung dây tại [`wireframe/README.md`](wireframe/README.md), bao gồm 27 màn hình chuyên biệt:

1. **Phân Hệ Khách Hàng (Commerce Shell — Guest & Customer Journey)**:
   - `SCR-01`: Đăng Nhập / Đăng Ký / Quên Mật Khẩu (`/login`, `/register`, `/forgot`)
   - `SCR-02`: Trang Chủ & Tìm Kiếm Ngữ Nghĩa (`/`)
   - `SCR-03`: Danh Mục Sản Phẩm & Bộ Lọc Nâng Cao (`/catalog`, `/products`)
   - `SCR-04`: Chi Tiết Sản Phẩm & Tồn Kho Chi Nhánh PDP (`/products/[sku]`)
   - `SCR-05`: Ma Trận So Sánh Kỹ Thuật Đối Đầu (`/compare`)
   - `SCR-06`: Cửa Sổ Trợ Lý Tư Vấn Thông Minh AI Advisor (`Drawer / Floating Widget`)
   - `SCR-07`: Giỏ Hàng & Tính Toán Số Học Chính Xác (`/cart`)
   - `SCR-08`: Đặt Hàng Đa Bước & Chọn Điểm Nhận Siêu Thị MWG (`/checkout`)
   - `SCR-09`: Xác Nhận Đơn Hàng & Biên Nhận Khóa Tồn (`/checkout/success`)
   - `SCR-10`: Lịch Sử Đơn Hàng & Theo Dõi Hành Trình Giao Hàng (`/orders`, `/orders/[id]`)
   - `SCR-11`: Cổng Bảo Hành Điện Tử & Đổi Trả 30 Ngày (`/warranty`, `/warranty/[serial]`)
   - `SCR-12`: Trung Tâm Hỗ Trợ & Phiếu Khiếu Nại (`/support`, `/support/tickets`)
   - `SCR-13`: Hồ Sơ Khách Hàng & Quyền Riêng Tư PII NĐ 13/2023 (`/profile`, `/profile/privacy`)

2. **Phân Hệ Quản Trị Bán Lẻ & Vận Hành (Admin Shell — Operations & Governance)**:
   - `SCR-14`: Bảng Điều Khiển Tổng Quan Doanh Thu & FinOps (`/admin`, `/admin/dashboard`)
   - `SCR-15`: Quản Lý Sản Phẩm & Biến Thể Laptop PIM (`/admin/catalog`, `/admin/products`)
   - `SCR-16`: Ma Trận Tồn Kho Chi Nhánh Đa Kênh (`/admin/inventory`)
   - `SCR-17`: Quản Lý Đơn Hàng & Điều Phối Kho OMS (`/admin/orders`, `/admin/orders/[id]`)
   - `SCR-18`: Cổng Phê Duyệt Tác Vụ Con Người HITL Gate (`/admin/hitl`, `/admin/hitl/[taskId]`)
   - `SCR-19`: Quản Trị Kho Tri Thức RAG & Qdrant (`/admin/knowledge`)
   - `SCR-20`: Cấu Hình Khuyến Mãi & Quy Tắc Giá SSOT (`/admin/promotions`)
   - `SCR-21`: Giám Sát Arize Phoenix & OTel Traces (`/admin/observability`)
   - `SCR-22`: Sổ Cái Bất Biến SHA-256 & Phân Quyền RBAC (`/admin/audit-logs`, `/admin/rbac`)
   - `SCR-23`: Quản Lý Chi Nhánh & Điểm Bán Siêu Thị MWG (`/admin/stores`)
   - `SCR-24`: Cài Đặt Hệ Thống & Khả Năng Tự Phục Hồi (`/admin/settings`)

3. **Phân Hệ Tiện Ích & Trạng Thái Hệ Thống (System Utility & States)**:
   - `SCR-25`: Trang Lỗi 404 Không Tìm Thấy Trang (`/_not-found`, `/404`)
   - `SCR-26`: Trang Lỗi 500 Tự Phục Hồi Graceful Degradation (`/500`)
   - `SCR-27`: Trang Báo Cáo Sức Khỏe Dịch Vụ (`/status`)

