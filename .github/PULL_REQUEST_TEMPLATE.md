## 1. Mục Đích & Thay Đổi (Change Summary)

<!-- Mô tả ngắn gọn thay đổi: sửa bug gì, bổ sung tính năng nào, hoặc cập nhật tài liệu kỹ thuật gì. -->

- **Use Case Mục Tiêu:** [Ví dụ: `UC02`, `UC03`, `UC08` hoặc `None/Refactor`]
- **Đối Tượng Người Dùng (Persona):** [ ] `Guest` | [ ] `Customer` | [ ] `Admin` | [ ] `System/Ops`
- **Mã Phiên Bản / Module Tác Động:** [Ví dụ: `apps/backend`, `apps/agent`, `apps/frontend`, `enterprise-docs`]

---

## 2. Loại Thay Đổi (Change Type)

- [ ] `feat` — Tính năng mới (phải khớp với phạm vi 12 Use Cases khóa cứng).
- [ ] `fix` — Sửa lỗi logic nghiệp vụ, giao dịch hoặc tác tử AI.
- [ ] `perf` — Tối ưu hiệu năng, caching hoặc giảm độ trễ token (FinOps).
- [ ] `security` — Củng cố bảo mật, ranh giới tác tử hoặc lọc PII tiếng Việt.
- [ ] `test` — Bổ sung test suites (Jest / Pytest / E2E).
- [ ] `docs` — Cập nhật tài liệu kiến trúc, ADR hoặc cẩm nang kỹ thuật.
- [ ] `chore` / `refactor` — Tái cấu trúc mã nguồn không đổi hành vi nghiệp vụ.

---

## 3. Bảng Kiểm Tra Tuân Thủ Hiến Pháp Kỹ Thuật (Constitution Compliance Checklist)

*Người tạo PR bắt buộc phải tích chọn xác nhận toàn bộ các điều khoản dưới đây trước khi yêu cầu review:*

### A. Ranh Giới Chân Lý Dữ Liệu & Giao Dịch ACID (PostgreSQL SSOT)
- [ ] **Chân lý duy nhất:** Không cấp quyền kết nối CSDL trực tiếp cho LLM; mọi truy vấn giá/kho lấy từ PostgreSQL SSOT.
- [ ] **Chống bán vượt tồn kho (Oversell):** Mọi thao tác kiểm tra và giữ kho đều dùng Transaction CSDL với `SELECT ... FOR UPDATE` (Pessimistic Locking).
- [ ] **Bảo vệ Idempotency:** Điểm cuối chốt đơn có bảo vệ bởi Header `Idempotency-Key`.
- [ ] **Chuẩn số học tiền tệ:** Dùng `NUMERIC(18, 0)` trong Postgres, `Decimal` trong Python, `string` trong TypeScript; **tuyệt đối không dùng `float` hay `number`**.

### B. An Toàn Tác Tử AI & Bảo Vệ Quyền Riêng Tư (AI Safety & Decree 13)
- [ ] **Chốt chặn Human-In-The-Loop:** AI không tự ý chốt đơn; chỉ sinh `preview_token` để khách hàng bấm xác nhận tường minh.
- [ ] **Làm sạch PII tiếng Việt:** Áp dụng Regex lọc sạch số CCCD (12 số), SĐT và email trước khi gửi ra LLM hoặc ghi log/traces.
- [ ] **Tính toán AST an toàn:** Không dùng `eval()` hoặc `exec()`; bắt buộc dùng `ASTSafeCalculator` cho các biểu thức khuyến mãi, trả góp.
- [ ] **Giới hạn số bước:** Đồ thị LangGraph có chốt chặn `MAX_STEPS = 5` và `recursion_limit` chống vòng lặp vô tận.

### C. Kỷ Luật Mã Nguồn & Chất Lượng Kiểm Thử (Code Quality & Secrets)
- [ ] **Quét rò rỉ secret:** Đã chạy `make scan-secrets` — **không có API key, secret, password hoặc token** trong git diff.
- [ ] **Kiểm thử tự động:**
  - `apps/backend`: `npm test` xanh 100%.
  - `apps/agent`: `pytest tests/` xanh, độ bao phủ mã nguồn $\ge 70\%$.
  - `apps/frontend`: `npm run build` không có lỗi type hay routing.
- [ ] **Ranh giới module:** Không có hàm khổng lồ > 50 dòng; không dùng bare except (`except: pass`).
