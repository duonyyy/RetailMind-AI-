# 🛡️ Nhóm 11 — Quản Trị Dự Án & Tiến Độ Thực Thi (Governance & Progress)

**Dự án:** RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Vị trí:** `enterprise-docs/docs/11-governance-progress/`  
**Mục đích:** Nơi lưu giữ hồ sơ quản trị dự án nghiêm ngặt, bằng chứng niêm phong tính toàn vẹn tài liệu (Cryptographic Integrity Hashes) và lộ trình kiểm thử chất lượng qua từng giai đoạn phát triển.

---

## 📑 Danh Mục Hồ Sơ Quản Trị & Tiến Độ

| Mã Tài Liệu | Tên Tài Liệu | Nội Dung Cốt Lõi | Giá Trị Quản Trị Hệ Thống |
| :---: | :--- | :--- | :--- |
| **01** | [01-DESIGN_BASELINE_SHA256.md](01-DESIGN_BASELINE_SHA256.md) | **Bảng Băm SHA-256 Niêm Phong Baseline Phase 0** | Bảng kiểm kê 38 tài liệu thiết kế nền tảng kèm mã băm SHA-256 thực tế, bảo đảm tính bất biến, chống giả mạo hồ sơ trước khi code. |
| **02** | [02-PROJECT_STATUS.md](02-PROJECT_STATUS.md) | **Báo Cáo Trạng Thái Dự Án Toàn Diện** | Bản đồ theo dõi tiến độ tổng thể của toàn bộ 10 Phân kỳ (Phase 0 đến Phase 9), tiến độ cổng Gate, trạng thái phân việc. |
| **03** | [03-MICRO_DECISIONS.md](03-MICRO_DECISIONS.md) | **Sổ Nhật Ký Quyết Định Kiến Trúc Vi Mô (Micro-Decisions)** | Ghi nhận chi tiết các đánh đổi kỹ thuật nhỏ nhưng quan trọng phát sinh trong quá trình triển khai thực tế. |
| **04** | [04-TEST_RESULTS.md](04-TEST_RESULTS.md) | **Biên Bản Kiểm Thử & Thẩm Định Cổng Cứng (Gate Audit)** | Báo cáo chi tiết kết quả thẩm định 10 tiêu chuẩn cổng cứng (P0-G01 đến P0-G10) của Phase 0 trước khi giải phóng Phase 1. |
| **05** | [05-NEXT_ACTIONS.md](05-NEXT_ACTIONS.md) | **Kế Hoạch Hành Động Tiếp Theo (Action Items)** | Danh sách việc cần làm cụ thể khi chính thức chuyển trạng thái sang Phase 1 (Khởi tạo dự án, Monorepo, Database DDL). |

---

## 🔐 Kỷ Luật Quản Trị Tính Toàn Vẹn (Integrity Discipline)

> [!IMPORTANT]
> **Quy Tắc Niêm Phong Bất Biến (Baseline Freeze):**
> Mọi thay đổi đối với tài liệu thiết kế sau khi đã niêm phong mã băm trong [01-DESIGN_BASELINE_SHA256.md](01-DESIGN_BASELINE_SHA256.md) đều bắt buộc phải được theo dõi qua Quy trình Yêu Cầu Thay Đổi (Change Request - CR), nghiêm cấm tự ý sửa đổi ngầm để giữ vững kỷ luật kỹ nghệ phần mềm cấp doanh nghiệp.
