# ADR-003: Sử Dụng LangGraph StateGraph Đơn Tác Tử Thay Vì Bầy Tác Tử Đa Tác Tử (Multi-Agent Swarm)

**Mã quyết định:** `ADR-003`  
**Dự án:** RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Trạng thái:** `APPROVED FOR BASELINE`  
**Ngày quyết định:** 2026-10-20  
**Tác giả:** Technical Architecture Team & Antigravity Pair Programmer  
**Căn cứ:** `prompt_sections/04_PHASE_PLAN.md` (Gate P0-G06) & `prompt_sections/02_ARCHITECTURE_AND_DOMAIN.md`  

---

## 1. Ngữ Cảnh & Vấn Đề Kỹ Thuật (Context & Problem Statement)

Để hiện thực hóa ca sử dụng Trợ lý tư vấn mua sắm máy tính (`UC03`), hệ thống cần điều phối quy trình phân tích ngôn ngữ tự nhiên, gọi công cụ tra cứu catalog, kiểm tra tồn kho và trích dẫn chính sách bảo hành.
Có hai mô hình kiến trúc điều phối tác tử:
1. **Lựa chọn A (Multi-Agent Swarm):** Sử dụng các framework như CrewAI hoặc AutoGen để dựng nhiều agent trò chuyện chéo với nhau (ví dụ: `SearchAgent`, `InventoryAgent`, `PolicyAgent`, `AdvisorAgent`).
2. **Lựa chọn B (Single LangGraph StateGraph Orchestrator):** Sử dụng một StateGraph duy nhất với máy trạng thái hữu hạn có định kiểu (Typed State Machine), điều phối luồng gọi công cụ thông qua Router Node và kiểm soát trần bước lặp.

---

## 2. Phân Tích So Sánh Các Giải Pháp (Options Comparison)

| Tiêu chí | Lựa chọn A: Multi-Agent Swarm (CrewAI / AutoGen) | Lựa chọn B: Single LangGraph StateGraph Orchestrator |
|---|---|---|
| **Độ trễ phản hồi (End-to-End Latency)** | Rất cao (> 10–20 giây) do các agent phải hội thoại qua lại nhiều lượt để thống nhất ý kiến. | Rất thấp (< 2–4 giây); chuyển trạng thái trực tiếp giữa các node theo logic có cấu trúc. |
| **Chi phí Token (Token Consumption)** | Tiêu tốn gấp 3–5 lần số lượng token do lặp lại System Prompt và chat history giữa các agent. | Tiết kiệm token tối đa; chỉ truyền context cần thiết vào từng tool invocation node. |
| **Khả năng dự đoán & Tính tất định** | Kém; nguy cơ cao rơi vào vòng lặp vô tận (Infinite Loop) hoặc ảo giác lan truyền giữa các agent. | **Cao tuyệt đối**; luồng đi được kiểm soát bằng Conditional Edges và trần ngắt khẩn cấp `MAX_STEPS = 5`. |
| **Khả năng quan sát & Gỡ lỗi (Debugging)** | Khó trace nguyên nhân gốc rễ khi một agent trong bầy đưa ra thông tin sai. | Mỗi bước chuyển trạng thái (State Transition) được ghi vết rõ ràng vào SQLite/PostgreSQL Checkpoint. |

---

## 3. Quyết Định Kiến Trúc (Decision)

**Quyết định: SỬ DỤNG MỘT LANGGRAPH STATEGRAPH ĐIỀU PHỐI DUY NHẤT (SINGLE AGENT ORCHESTRATOR).**
1. **Kiến trúc StateGraph:** Hệ thống xây dựng một đồ thị trạng thái gồm các node rõ ràng: `inbound_guard` $\to$ `intent_classifier` $\to$ `tool_executor` $\to$ `synthesizer` $\to$ `outbound_sanitizer`.
2. **Trần bước lặp (`MAX_STEPS = 5`):** Nếu số bước lặp giữa LLM và Tool vượt quá 5 bước mà chưa kết thúc, hệ thống tự động kích hoạt chốt chặn Emergency Break, tổng hợp câu trả lời từ dữ liệu hiện có và gửi về cho khách hàng.
3. **Phân lập trạng thái:** Trạng thái hội thoại được phân lập nghiêm ngặt theo `thread_id` thuộc sở hữu của từng `customer_id`.

---

## 4. Hệ Quả & Đánh Đổi (Consequences)

### Tích cực (Positive):
* Phù hợp hoàn hảo với tiêu chuẩn doanh nghiệp sản xuất (Production-Grade): Nhanh, tin cậy, tiết kiệm chi phí vận hành và không bao giờ bị treo vòng lặp.
* Dễ dàng viết kiểm thử tự động (Unit Test / Integration Test) bằng `MockModelProvider`.

### Tiêu cực & Biện pháp khắc phục (Risks & Mitigations):
* *Rủi ro:* Cần thiết kế prompt phân loại ý định (Intent Classifier) đủ tốt để trích xuất chính xác các tham số tìm kiếm đa dạng.
* *Biện pháp:* Sử dụng Pydantic Structured Outputs (`with_structured_output`) để ép kiểu dữ liệu đầu ra của LLM khớp 100% với schema `ProductSearchFilters`.
