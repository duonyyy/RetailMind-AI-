# RetailMind AI — Core Commerce Backend API (NestJS Enterprise)

Hệ thống dịch vụ Backend trung tâm của nền tảng **RetailMind AI**, xây dựng trên nền tảng **NestJS 10/12+**, **Node.js 20+**, **TypeScript**, **TypeORM**, và **PostgreSQL 16+ (SSOT)**.

---

## 🎯 Kiến Trúc & Tài Liệu Thiết Kế

- **Kế Hoạch Triển Khai 6 Giai Đoạn:** Xem chi tiết tại [`docs/CORE_API_IMPLEMENTATION_PLAN.md`](./docs/CORE_API_IMPLEMENTATION_PLAN.md).
- **Hiến Pháp Vận Hành & An Ninh:** Xem chi tiết tại [`../AGENTS.md`](../AGENTS.md).
- **Báo Cáo Rà Soát & Backlog:** Xem chi tiết tại [`../BAO_CAO_RA_SOAT_BACKLOG_2026-10-29.md`](../BAO_CAO_RA_SOAT_BACKLOG_2026-10-29.md).

---

## 🏗️ Nguyên Tắc Kỹ Thuật Cốt Lõi

1. **Single Source of Truth (SSOT):** PostgreSQL 16+ là nguồn chân lý duy nhất cho giá niêm yết, tồn kho và giao dịch.
2. **Khóa Bi Quan Chống Bán Vượt Tồn:** Khóa hàng với `SELECT ... FOR UPDATE` (`setLock('pessimistic_write')`) trong transaction.
3. **Số Học Tiền Tệ Tuyệt Đối:** Sử dụng 100% `Decimal` (`decimal.js`) / `NUMERIC(18, 0)` trong database, triệt tiêu sai số làm tròn float.
4. **Phòng Thủ Chiều Sâu & Chống IDOR:** Xác thực quyền sở hữu nghiêm ngặt qua Principal server-side (`customer_id === current_user.id`).
5. **Cổng Kết Nối Tác Tử (Internal Tool Gateway):** Phục vụ 16 Typed Tools cho Python AI Agent qua `/api/v1/internal/tools/*` với cơ chế Zero-Trust.

---

## 🚀 Hướng Dẫn Vận Hành Nhanh

### 1. Cài Đặt Phụ Thuộc
```bash
npm install
```

### 2. Chạy Kiểm Thử Tự Động
```bash
npm test
```

### 3. Khởi Chạy Máy Chủ Phát Triển (Dev Server)
```bash
npm run start:dev
```
Cổng mặc định: `http://localhost:4000`

