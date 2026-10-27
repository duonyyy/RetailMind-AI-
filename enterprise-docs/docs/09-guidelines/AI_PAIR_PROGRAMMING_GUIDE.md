# Hướng Dẫn Lập Trình Cùng Trợ Lý AI (AI Pair Programming Playbook)

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/09-guidelines/AI_PAIR_PROGRAMMING_GUIDE.md`  
**Căn cứ đặc tả**: `AGENTS.md`, `PLANS.md` & `DESIGN_BASELINE_v1.md`  
**Trạng thái**: Approved for Architecture Baseline (Production 2026 Edition)  

---

## 1. Triết Lý Cộng Tác Cùng AI (The AI Pair Programming Mindset)

Trong dự án **RetailMind AI**, trợ lý AI (Codex, Antigravity, Pair Programmers) là những cộng sự đắc lực giúp tăng tốc độ triển khai mã nguồn gấp nhiều lần. Tuy nhiên, nếu thiếu rào chắn kỹ thuật (Guardrails), AI có thể tự tiện:
1. Bịa ra các bảng CSDL mới hoặc tự thêm endpoint không có trong thiết kế (Scope Creep).
2. Tạo ra code chạy được trên bề mặt nhưng sập ngay khi có 2 request song song mua chiếc laptop cuối cùng (Overselling Race Condition).
3. Cho phép AI tự ý chốt đơn hàng hoặc kết nối trực tiếp vào CSDL bằng Text-to-SQL (Vi phạm nghiêm trọng an ninh).
4. Tự ý gán nhãn `DONE` cho các tính năng chưa chạy test thật (Báo cáo sai lệch).

> [!IMPORTANT]
> **Hiến Pháp AGENTS.md**: Bạn và hồ sơ kiến trúc trong `enterprise-docs/` là Kiến Trúc Sư Trưởng. AI chỉ được phép sinh mã dựa trên đúng các hợp đồng kiến trúc đã đóng băng trong `DESIGN_BASELINE_v1.md`!

---

## 2. Bốn Rào Chắn Chống Ảo Giác Bắt Buộc (Anti-Hallucination Guardrails)

1. **Ràng Buộc Vào Single Source of Truth**: Bắt buộc AI đọc tài liệu trong `enterprise-docs/` trước khi viết code. Nếu AI đề xuất một bảng không có trong `09-DATABASE_DESIGN.md` (22 bảng) hoặc use case không nằm trong `UC01..12`, bạn phải từ chối ngay lập tức.
2. **Kỷ Luật Khóa Phạm Vi (Scope Lock Discipline)**: Không phát triển Ops AI, ERP, chấm công, Purchasing hay Procurement.
3. **Quy Tắc Ranh Giới Tác Tử (Agent Boundary)**:
   $$\text{LLM Proposes (Tool JSON)} \longrightarrow \text{Pydantic Validation} \longrightarrow \text{Server-Side Authz} \longrightarrow \text{Trusted Internal Service}$$
   LLM tuyệt đối không phải là Database Client. Không cấp quyền kết nối CSDL trực tiếp, không cấp quyền Shell / Command Line cho Agent.
4. **Kỷ Luật Cổng Chất Lượng & Báo Cáo Trung Thực**: Không bao giờ gán nhãn `DONE` hay `PASSED` cho tính năng chưa viết code thật; mọi bài test ở Phase 0 đều giữ nhãn `NOT_RUN`. AI không tự ý phê duyệt cổng Phase thay cho con người.

---

## 3. Khung Prompt Mẫu Chuẩn Cho Kỹ Sư Khi Giao Việc Cho AI

Hãy sao chép khung prompt này khi yêu cầu AI viết code cho bất kỳ phân hệ nào trong RetailMind AI:

```text
BẠN ĐÓNG VAI TRÒ: Senior Python & AI Systems Engineer của dự án RetailMind AI.
HIẾN PHÁP BẮT BUỘC: Tuân thủ tuyệt đối AGENTS.md tại thư mục gốc và các tài liệu trong enterprise-docs/.

NHIỆM VỤ: Hãy triển khai phân đoạn [Tên tính năng, ví dụ: Chốt đơn giả lập an toàn]
USE CASE LIÊN QUAN: [Mã UC, ví dụ: UC08 — Preview & Chốt Đơn Giả Lập]
ENDPOINTS LIÊN QUAN: [Ví dụ: POST /api/v1/orders/confirm]

YÊU CẦU THỰC HIỆN:
1. Đọc và tuân thủ đúng DTOs trong 12-API_DESIGN.md và DDL trong 09-DATABASE_DESIGN.md.
2. Tiền tệ VNĐ bắt buộc dùng kiểu Decimal và NUMERIC(18, 0), nghiêm cấm dùng float.
3. Triển khai Database Transaction kết hợp khóa bi quan SELECT ... FOR UPDATE trên bảng inventory (sắp xếp tăng dần theo store_id, variant_id để chống Deadlock).
4. Kiểm soát chống IDOR: Gắn customer_id từ Token Context, cấm nhận từ client body.
5. Kiểm tra Idempotency Key chống chốt đơn trùng lặp.
6. Viết bộ kiểm thử pytest bao phủ: Thành công (201), Hết hàng (409), Thiếu auth (401), và Race condition 2 luồng song song.
7. Giải thích rõ ràng các trade-offs và luồng thực thi bằng Tiếng Việt.
```
