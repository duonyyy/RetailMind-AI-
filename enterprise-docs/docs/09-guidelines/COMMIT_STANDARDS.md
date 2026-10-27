# Quy Chuẩn Commit Chuẩn Production (Production Git Commit Standards)

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/09-guidelines/COMMIT_STANDARDS.md`  
**Tiêu chuẩn tuân thủ**: [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) & SemVer 2.0.0  
**Trạng thái**: Approved — Bắt buộc áp dụng cho toàn bộ kỹ sư và AI Agents  

---

## 1. Triết Lý & Tầm Quan Trọng (Philosophy & Motivation)

Trong một hệ thống trí tuệ nhân tạo bán lẻ cấp doanh nghiệp, lịch sử commit Git là:
1. **Hồ Sơ Kiến Trúc Sống (Living Architecture Document)**: Giải thích lý do kỹ thuật (*Why*), bối cảnh ra quyết định và các đánh đổi (Trade-offs) sau mỗi thay đổi.
2. **Nền Tảng Tự Động Hóa CI/CD**: Tự động kích hoạt kiểm thử phân tầng và gắn tag phát hành theo chuẩn Semantic Versioning (`MAJOR.MINOR.PATCH`).
3. **Hồ Sơ Kiểm Toán An Ninh (Security Audit Trail)**: Ngăn chặn mã độc, rò rỉ API secrets và backdoor lọt vào môi trường sản xuất.

> [!IMPORTANT]
> **Quy Tắc Bất Biến**: Mỗi commit phải là một bước tiến nguyên tử (Atomic Commit), độc lập và pass 100% tests. Tuyệt đối không commit mã dở dang làm gãy pipeline CI!

---

## 2. Cấu Trúc Định Dạng Chuẩn (Commit Message Anatomy)

```text
<type>(<scope>): <subject>

[optional body: Bối cảnh, lý do thay đổi và giải pháp kỹ thuật]

[optional footer(s): BREAKING CHANGE, Phase liên kết, Ký duyệt an ninh]
```

### 2.1. Danh Mục Types Chuẩn Production (Type Taxonomy)

| Type | Khi Nào Sử Dụng? | Ví Dụ Tiêu Đề Chuẩn |
|:---: |:--- |:--- |
| **`feat`** | Thêm một tính năng nghiệp vụ hoặc endpoint mới | `feat(auth): implement argon2id password hashing and jwt rotation` |
| **`fix`** | Sửa một lỗi logic hoặc lỗ hổng hệ thống | `fix(checkout): enforce pessimistic lock to prevent overselling` |
| **`refactor`**| Tái cấu trúc mã nguồn mà không đổi hành vi nghiệp vụ | `refactor(advisor): extract tool execution into isolated service` |
| **`security`**| Vá lỗ hổng an ninh hoặc gia cố phòng thủ IDOR/PII | `security(pii): add regex sanitization guard for vietnamese id` |
| **`perf`** | Tối ưu hóa hiệu năng, giảm truy vấn CSDL, thêm index | `perf(database): add composite index on inventory store and variant` |
| **`test`** | Thêm mới hoặc bổ sung các ca kiểm thử tự động | `test(concurrency): add race condition test for double checkout` |
| **`docs`** | Thêm hoặc cập nhật tài liệu kiến trúc, specs, ADRs | `docs(architecture): freeze design baseline v1 with sha-256 hashes` |
| **`chore`** | Cập nhật dependencies, cấu hình Docker, Alembic | `chore(docker): bump postgres container image to alpine 16` |

### 2.2. Danh Mục Scopes Chuẩn Hóa Theo Phân Hệ (Scope Taxonomy)

* `auth`: Xác thực, phân quyền, JWT, mật khẩu Argon2id.
* `catalog`: Danh mục sản phẩm, biến thể laptop, thông số kỹ thuật.
* `inventory`: Tồn kho chi nhánh, tính toán tồn khả dụng.
* `commerce`: Giỏ hàng, preview token, chốt đơn, hủy đơn.
* `agent`: LangGraph StateGraph, tool routing, prompt context.
* `rag`: Qdrant collection, ingestion job, trích dẫn chính sách.
* `security`: IDOR check, PII filter, rate limiting, encryption.
* `database`: PostgreSQL schema, Alembic migrations, indexes.
* `deps`: Thư viện Python, npm packages, Docker images.

---

## 3. Ví Dụ Commit Chuẩn Mẫu

```git
feat(commerce): implement pessimistic locking for checkout concurrency

- Use SELECT ... FOR UPDATE on inventory records sorted by (store_id, variant_id) to eliminate deadlocks.
- Reject checkout with 409 Conflict if available_qty < requested_qty.
- Record audit_event for every confirmed order.

Security-Impact: critical (prevents oversell and financial loss)
Phase: Phase 5 (UC08)
```
