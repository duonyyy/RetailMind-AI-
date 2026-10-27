---
name: "Yêu Cầu Thay Đổi / Tính Năng Mới (Change Request)"
about: "Đề xuất tính năng mới hoặc thay đổi kiến trúc tuân thủ Kỷ luật Khóa Phạm Vi (Scope Lock)"
title: "[CR]: "
labels: ["change-request", "scope-governance"]
assignees: ""
---

## 1. Tôn Chỉ Kỷ Luật Khóa Phạm Vi (Scope Lock Notice)
> **CẢNH BÁO QUẢN TRỊ:** Dự án RetailMind AI khóa cứng 3 Personas (`Guest`, `Customer`, `Admin`) và 12 Use Cases (`UC01` đến `UC12`). Mọi ý tưởng tính năng ngoài phạm vi này (ERP, nhân sự, chấm công, mua sắm vật tư) **bắt buộc phải ghi vào `docs/roadmap/FUTURE_EXPANSIONS.md`** và chỉ được thực thi khi có Change Request được người dùng phê duyệt chính thức.

## 2. Mục Đích & Bối Cảnh (Context & Justification)
<!-- Tại sao cần thay đổi này? Giải quyết bài toán nghiệp vụ gì? -->

## 3. Ảnh Hưởng Kiến Trúc & Dữ Liệu (Architectural Impact)
- [ ] Có ảnh hưởng đến 22 bảng CSDL hiện hữu không?
- [ ] Có ảnh hưởng đến ranh giới PostgreSQL SSOT và Qdrant không?
- [ ] Có yêu cầu bổ sung Quyết định Kiến trúc (ADR) mới không?

## 4. Kế Hoạch Đánh Giá & Kiểm Thử (Verification Plan)
<!-- Làm sao chứng minh thay đổi này đạt chuẩn SLA: Accuracy >= 85%, Latency <= 2.5s, Coverage >= 70%? -->
