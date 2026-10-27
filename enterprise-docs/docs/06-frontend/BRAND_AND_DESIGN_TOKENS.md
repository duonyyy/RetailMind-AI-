# 🎨 Brand Identity & Design Tokens Specification (Cẩm Nang Định Danh Thương Hiệu & Tokens)

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/06-frontend/BRAND_AND_DESIGN_TOKENS.md`  
**Phong cách**: Minimal Tech / Modern Retail SaaS (Thanh lịch, Chuẩn xác, Tin cậy)  
**Phiên bản**: Production 2026 Edition  
**Quy chuẩn hình học**: Disciplined Geometry (4px - 6px - 8px)  
**Trạng thái**: Approved for Architecture Baseline (Production 2026 Edition)  

---

## 1. Triết Lý Thiết Kế & Định Vị Thương Hiệu (Design Philosophy)

Giao diện của **RetailMind AI** được thiết kế theo triết lý **"Invisible Tech — Crisp Information — Solid Experience"**:
* **Thanh lịch & Hiện đại (Minimal Tech)**: Sử dụng cặp màu thương hiệu chủ đạo **Royal Blue (`#2563EB`)** và **Electric Cyan (`#06B6D4`)** trên nền Slate dịu mắt, mang hơi thở công nghệ cao nhưng giữ vững sự nghiêm cẩn của nền tảng thương mại bán lẻ quy mô lớn.
* **Hình học kỷ luật (Disciplined Geometry)**: Triệt tiêu các bo góc quá tròn trịa (pill/bubble) thiếu chuyên nghiệp; áp dụng hệ thống bo góc chuẩn mực: 4px (`ts-radius-xs/sm`), 6px (`ts-radius-md`), 8px (`ts-radius-lg`).
* **Số học chuẩn xác & Chân lý dữ liệu**: Mọi con số tiền tệ, số lượng tồn kho khả dụng và mã SKU đều hiển thị dạng `tabular-nums` để phục vụ khả năng đọc nhanh và so sánh đối đầu không lệch hàng.
* **Khả năng tiếp cận WCAG 2.2 AA / AAA**: Tất cả các cặp màu văn bản và nền trạng thái đều có độ tương phản tối thiểu 4.5:1 (AA) và đạt 7.0:1 (AAA) cho văn bản quan trọng.

---

## 2. Hệ Thống Tokens Màu Sắc Đầy Đủ (Semantic Color Palette)

```css
:root {
  /* =========================================================================
   * BRAND CORE TOKENS
   * ========================================================================= */
  --ts-primary: #2563eb;          /* Royal Blue 600 - CTA chính, Active item, Focus ring */
  --ts-primary-hover: #1d4ed8;    /* Royal Blue 700 - Hover nút chính */
  --ts-primary-soft: #eff6ff;     /* Blue 50 - Nền mục được chọn, Highlight nhẹ */
  --ts-cyan: #06b6d4;             /* Cyan 500 - Điểm nhấn công nghệ, Tiến trình AI */
  --ts-cyan-hover: #0891b2;       /* Cyan 600 - Hover điểm nhấn */
  --ts-cyan-soft: #ecfeff;        /* Cyan 50 - Nền mờ công nghệ */
  --ts-dark: #0f172a;             /* Slate 900 - Tiêu đề, Nội dung chữ chính (AAA) */
  --ts-light: #f8fafc;            /* Slate 50 - Nền trang chính dịu mắt */
  --ts-surface: #ffffff;          /* Trắng - Nền card, Dialog, Question box */
  --ts-border: #dbeafe;           /* Đường phân cách dịu nhẹ */
  --ts-border-strong: #bfd9ff;    /* Viền card hover */
  --ts-muted: #64748b;            /* Slate 500 - Nhãn phụ, Metadata, Caption */
  --ts-muted-light: #94a3b8;      /* Slate 400 - Placeholder */

  /* =========================================================================
   * FUNCTIONAL STATUS TOKENS (REFINED PALETTE: JADE, AMBER, ROSE)
   * ========================================================================= */
  /* SUCCESS: Sắc ngọc Jade / Teal-Emerald — Dịu mắt, ăn nhập hoàn hảo với Royal Blue */
  --ts-success: #059669;          /* Emerald 600 - Tồn kho khả dụng, Đặt hàng thành công */
  --ts-success-hover: #047857;    /* Emerald 700 - Hover nút thành công */
  --ts-success-soft: #ecfdf5;     /* Emerald 50 - Nền badge thành công */
  --ts-success-border: #a7f3d0;   /* Emerald 200 - Viền badge thành công */
  --ts-success-text: #065f46;     /* Emerald 800 - Chữ trạng thái đạt chuẩn WCAG AAA (7.5:1) */

  /* WARNING: Sắc mật ong Honey Amber — Ấm áp, cảnh báo nghiêm cẩn, không chói gắt */
  --ts-warning: #d97706;          /* Amber 600 - Sắp hết hàng, Chờ duyệt HITL Gate */
  --ts-warning-hover: #b45309;    /* Amber 700 - Hover cảnh báo */
  --ts-warning-soft: #fffbeb;     /* Amber 50 - Nền badge cảnh báo */
  --ts-warning-border: #fde68a;   /* Amber 200 - Viền badge cảnh báo */
  --ts-warning-text: #92400e;     /* Amber 800 - Chữ cảnh báo đạt chuẩn WCAG AA (6.2:1) */

  /* DANGER: Sắc hồng ngọc Rose Crimson — Thanh lịch, không gây căng thẳng như đỏ cờ */
  --ts-danger: #e11d48;           /* Rose 600 - Hết hàng, Từ chối bồi hoàn, Lỗi API */
  --ts-danger-hover: #be123c;     /* Rose 700 - Hover nút nguy hiểm */
  --ts-danger-soft: #fff1f2;      /* Rose 50 - Nền badge lỗi */
  --ts-danger-border: #fecdd3;    /* Rose 200 - Viền badge lỗi */
  --ts-danger-text: #9f1239;      /* Rose 800 - Chữ cảnh báo đạt chuẩn WCAG AAA (7.1:1) */

  /* =========================================================================
   * GRADIENTS & SHADOWS
   * ========================================================================= */
  --ts-gradient: linear-gradient(110deg, #2563eb 0%, #087cf5 55%, #06b6d4 100%);
  --ts-gradient-cyan: linear-gradient(120deg, #2563eb 0%, #06b6d4 100%);
  --ts-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --ts-shadow-soft: 0 1px 3px rgba(15, 23, 42, 0.08);
  --ts-shadow-hover: 0 4px 12px rgba(15, 23, 42, 0.08);
  --ts-shadow-glow: 0 0 0 1px rgba(37, 99, 235, 0.15), 0 2px 8px rgba(37, 99, 235, 0.12);
}

/* Chế độ Dark Theme Sang Trọng */
.dark {
  --ts-primary: #3b82f6;
  --ts-primary-soft: #1e3a5f;
  --ts-cyan: #22d3ee;
  --ts-dark: #0f172a;
  --ts-light: #0b1220;
  --ts-surface: #111c32;
  --ts-border: #1e293b;
  --ts-border-strong: #334155;
  --ts-muted: #94a3b8;

  --ts-success: #10b981;
  --ts-success-soft: rgba(16, 185, 129, 0.12);
  --ts-success-border: rgba(52, 211, 153, 0.28);
  --ts-success-text: #6ee7b7;

  --ts-warning: #f59e0b;
  --ts-warning-soft: rgba(245, 158, 11, 0.12);
  --ts-warning-border: rgba(251, 191, 36, 0.28);
  --ts-warning-text: #fde68a;

  --ts-danger: #f43f5e;
  --ts-danger-soft: rgba(244, 63, 94, 0.12);
  --ts-danger-border: rgba(251, 113, 133, 0.28);
  --ts-danger-text: #fecdd3;
}
```

---

## 3. Quy Chuẩn Bo Góc & Độ Sâu (Disciplined Geometry & Elevation)

| Tên Token | Kích Thước | Ứng Dụng Trong Hệ Thống |
| :--- | :---: | :--- |
| **`--ts-radius-xs`** | `4px` | Nhãn trạng thái nhỏ (Badges), Tooltips, Checkbox |
| **`--ts-radius-sm`** | `4px` | Nút phụ (Secondary buttons), Thẻ thông số kỹ thuật nhỏ |
| **`--ts-radius-md`** | `6px` | Ô nhập dữ liệu (Inputs), Thẻ sản phẩm chuẩn (`.ts-feature-card`) |
| **`--ts-radius-lg`** | `8px` | Khung lớn (Modals, Dialogs, Dropdown Menus, Drawer Panel) |
| **`--ts-radius-full`**| `9999px`| Nút bấm chính tương tác cao (`.ts-cta`), Avatar người dùng |

---

## 4. Hệ Thống Kiểu Chữ (Typography Tokens)

* **Font chữ giao diện chính (UI & Body)**: `Inter`, `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
* **Số học chuẩn xác (Tabular Figures)**: Bắt buộc cấu hình thuộc tính CSS `font-variant-numeric: tabular-nums` cho mọi trường hiển thị giá tiền VNĐ, đồng hồ đếm ngược giữ tồn 10m và mã băm SHA-256.

| Cấp Bậc | Kích Thước | Độ Đậm (Weight) | Khoảng Cách Dòng | Ứng Dụng Thực Tế |
| :--- | :---: | :---: | :---: | :--- |
| **Display H1** | 36px / 2.25rem | Bold (700) | 1.2 | Banner Hero Trang Chủ, Tiêu đề thương hiệu |
| **Heading H2** | 24px / 1.5rem | Bold (700) | 1.25 | Tiêu đề khối danh mục, Tên laptop PDP |
| **Heading H3** | 18px / 1.125rem | Semi-Bold (600) | 1.3 | Tiêu đề card, Tiêu đề bảng so sánh |
| **Body Regular** | 14px / 0.875rem | Regular (400) | 1.5 | Nội dung mô tả sản phẩm, Bong bóng hội thoại |
| **Price Display**| 20px / 1.25rem | Extra-Bold (800)| 1.2 | Hiển thị giá niêm yết (VD: `17.990.000 ₫`) |
| **Badge / Caption**| 11px / 0.7rem | Semi-Bold (600) | 1.3 | Nhãn tồn kho chi nhánh, Căn cứ chính sách RAG |

---

## 5. Thư Viện Hoa Văn Nền & Tài Nguyên Đồ Họa 3D

1. **Bộ 11 Hoa Văn Nền SVG (`src/components/patterns/`)**:
   - `DotGridPattern`: Lưới chấm công nghệ dịu nhẹ dùng cho nền chính.
   - `CircuitBoardPattern`: Hoa văn bo mạch điện tử cho phân hệ Admin & FinOps.
   - `BrandSectionBackground`: Wrapper tích hợp Radial Ambient Glows và SVG overlay (độ trong suốt 0.05 – 0.08 không gây mỏi mắt).
2. **Bộ Minh Họa 3D Cao Cấp (`public/brand/`)**:
   - `hero-exam-orbit-3d.png`: Tranh minh họa quỹ đạo trí tuệ nhân tạo bán lẻ trung tâm.
   - 13 huy hiệu 3D: `icon-hero-orbit.png`, `icon-exam-creation.png`, `icon-scheduling.png`, `icon-security-shield.png`, `icon-analytics.png`, `icon-cube.png`, v.v.
