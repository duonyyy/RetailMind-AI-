# ADR-009: Kiến Trúc Frontend Next.js BFF Reverse Proxy, Tách Biệt Query/Action & Dynamic RBAC

**Mã quyết định:** `ADR-009`  
**Dự án:** RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Trạng thái:** `ACCEPTED` (Approved for Architecture Baseline)  
**Ngày quyết định:** 2026-10-23  
**Tác giả:** Technical Architecture Team & Antigravity Pair Programmer  
**Căn cứ tham chiếu:** Chuẩn kiến trúc doanh nghiệp React 19 / Next.js App Router kết hợp Feature-Based Architecture  

---

## 1. Ngữ Cảnh & Vấn Đề Kỹ Thuật (Context & Problem Statement)

Trong kiến trúc Polyglot của RetailMind AI (`ADR-007`), Frontend được xây dựng bằng Next.js 16+ App Router giao tiếp với NestJS 12+ Backend Core và Python AI Agent. Khi triển khai trên môi trường thương mại điện tử thực tế, kiến trúc frontend truyền thống gặp phải 4 trở ngại kỹ thuật:

1. **Rủi ro rò rỉ JWT Token tại Client-Side (XSS Vulnerability):** Việc lưu trữ `access_token` trong `localStorage` hoặc `sessionStorage` của trình duyệt khiến token dễ dàng bị đánh cắp nếu trang web dính lỗ hổng XSS từ thư viện bên thứ ba.
2. **Nghẽn luồng SSE Streaming trong Next.js App Router:** Giao thức Server-Sent Events khi chuyển tiếp qua Next.js Server Components hoặc Route Handlers thường bị buffering hoặc timeout nếu không cấu hình chuẩn `duplex: 'half'` theo chuẩn Node.js Web Streams.
3. **Pha trộn hỗn loạn giữa logic đọc và ghi dữ liệu:** Các component React thường gọi trực tiếp các API đột biến trạng thái (mutations) xen lẫn các truy vấn đọc (queries), làm mất tính kiểm soát cache, khó quản lý revalidation tags và gây khó khăn khi debug audit log.
4. **Thiếu cơ chế phân quyền giao diện động (Dynamic UI RBAC):** Các trang quản trị, giỏ hàng hoặc nút chốt đơn cần một cơ chế bảo vệ phân quyền tập trung, tương thích cả Server Components lẫn Client Components mà không phải viết lặp lại các lệnh `if (user.role !== 'ADMIN')` rải rác khắp mã nguồn.

---

## 2. Quyết Định Kiến Trúc (Architecture Decision)

Hệ thống thống nhất chuẩn hóa kiến trúc Frontend Next.js theo 4 trụ cột thiết kế:

### 2.1. Mô Hình BFF Reverse Proxy (`/api/proxy/[...path]`)
Frontend triển khai một Route Handler tập trung đóng vai trò Reverse Proxy Server-side:
* Trình duyệt Client chỉ gửi request về chính domain Next.js: `/api/proxy/v1/...`
* Server Route Handler tự động:
  1. Trích xuất JWT Access Token từ Cookie bảo mật `HttpOnly; Secure; SameSite=Strict`.
  2. Gắn kèm Header `Authorization: Bearer <token>` vào request chuyển tiếp sang NestJS Core Backend (Port 3001) hoặc Python Agent (Port 8000).
  3. Xóa bỏ hoàn toàn nguy cơ lộ token ra JavaScript client.
  4. Giải quyết 100% bài toán CORS giữa các domain / port nội bộ.

```typescript
// web-client/src/app/api/proxy/[...path]/route.ts
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const cookieStore = cookies();
  const token = cookieStore.get('retailmind_access_token')?.value;
  const targetUrl = `${BACKEND_BASE_URL}/${params.path.join('/')}`;

  const headers = new Headers(req.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Cấu hình truyền dòng chuẩn duplex: 'half' cho SSE và Large Payload
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body: req.body,
    // @ts-expect-error Node fetch streaming duplex requirement
    duplex: 'half',
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
```

### 2.2. Phân Tách Rạch Ròi Data Queries (`.get.ts`) & Server Actions (`.action.ts`)
Tất cả các tương tác dữ liệu trong mã nguồn Frontend tuân thủ nghiêm ngặt quy ước phân tách:
* **Data Queries (`*.get.ts`):** Chỉ thực hiện phương thức HTTP `GET`. Tích hợp sẵn Next.js Data Cache, ISR và gán `next: { tags: ['catalog', 'products'] }`. Chịu trách nhiệm hydrate dữ liệu cho Server Components.
* **Server Actions / Mutations (`*.action.ts`):** Sử dụng chỉ thị `'use server'`. Chuyên biệt cho các thao tác ghi (thêm giỏ hàng, hủy đơn, cập nhật kho, upload policy). Tích hợp sẵn xác thực server-side, tự động gọi `revalidateTag()` sau khi cập nhật thành công và ghi nhận nhật ký thao tác.

### 2.3. Chuẩn Hóa Server Fetcher & API Contract (`ServerResponseDto<T>`)
Tạo tiện ích fetcher `apiFetch` bao bọc mọi cuộc gọi mạng:
* Chuẩn hóa cấu trúc phong bì phản hồi:
  ```typescript
  export interface ServerResponseDto<T> {
    success: boolean;
    data: T | null;
    error: {
      code: string;
      message: string;
      details?: Record<string, unknown>;
    } | null;
    meta: {
      request_id: string;
      timestamp: string;
    };
  }
  ```
* Tự động truyền dẫn Trace Headers: `x-trace-id`, `x-correlation-id` xuyên suốt từ Client $\to$ Next.js $\to$ NestJS $\to$ Python Agent $\to$ PostgreSQL để đồng bộ OpenTelemetry spans.
* Tự động xử lý retry với Exponential Backoff đối với các lỗi mạng tạm thời (`502`, `503`, `504`).

### 2.4. Ma Trận Phân Quyền Giao Diện Động (Dynamic UI Access Control Matrix)
Xây dựng lớp bảo vệ RBAC đa tầng tương thích triết lý Refine `accessControlProvider`:
* **Tầng 1 (Next.js Middleware Guard):** Chặn các request tới `/admin/*` nếu user chưa xác thực hoặc không có role `ADMIN`; chặn `/checkout/*` nếu user là `GUEST`.
* **Tầng 2 (CanAccess UI Component):** Thành phần giao diện điều kiện hóa hiển thị các nút chức năng nhạy cảm:
  ```tsx
  <CanAccess resource="inventory" action="edit">
    <Button onClick={handleUpdateStock}>Điều chỉnh tồn kho</Button>
  </CanAccess>
  ```
* Khóa chặt phạm vi 3 Personas (`Guest`, `Customer`, `Admin`) theo đúng Hiến pháp `AGENTS.md`.

---

## 3. Hệ Quả & Đánh Đổi (Consequences & Trade-offs)

### Điểm tích cực (Pros):
* **Bảo mật cấp ngân hàng:** Access Token hoàn toàn vô hình trước JavaScript chạy tại trình duyệt, vô hiệu hóa các cuộc tấn công đánh cắp phiên qua XSS.
* **Trải nghiệm Streaming SSE mượt mà:** Khắc phục triệt để lỗi mất gói hoặc nghẽn buffer khi nhận token AI qua Next.js Route Handlers.
* **Kiến trúc Codebase sạch & dễ bảo trì:** Phân tách rõ ràng giữa đọc và ghi dữ liệu, chuẩn hóa phong bì lỗi, tận dụng tối đa sức mạnh Server Components và Revalidation Tags.
* **Kiểm soát quyền chặt chẽ:** Đảm bảo không người dùng nào thấy hoặc bấm được các nút chức năng vượt quá quyền hạn của họ.

### Đánh đổi (Cons):
* Next.js Server đóng vai trò trung gian chuyển tiếp (proxy hop) nên phát sinh thêm một độ trễ rất nhỏ (~1–3ms trên cùng mạng nội bộ), tuy nhiên hoàn toàn xứng đáng với giá trị bảo mật và đồng nhất kiến trúc.

---

## 4. Kiểm Thử Tuân Thủ (Compliance Checklist)
* [x] Route handler `/api/proxy/[...path]` truyền tải thành công luồng SSE không bị gián đoạn.
* [x] Cookie `retailmind_access_token` được lưu với cờ `HttpOnly; Secure; SameSite=Strict`.
* [x] Các file API tuân thủ cấu trúc tên `.get.ts` cho truy vấn đọc và `.action.ts` cho thao tác ghi.
* [x] Kiểm thử truy cập `/admin` bằng tài khoản Customer bị chặn bởi Next.js Middleware.
