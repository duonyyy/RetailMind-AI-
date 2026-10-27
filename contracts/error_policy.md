# BẢN CHÍNH SÁCH XỬ LÝ LỖI & PHÒNG THỦ CỦA RETAILMIND AI (ERROR POLICY)

Tài liệu này định nghĩa hành vi có giới hạn (**Bounded Failure Policies**) của nền tảng RetailMind AI khi gặp sự cố, đảm bảo hệ thống không bao giờ bị sập (Zero-Crash) và không bao giờ ảo giác.

---

## 1. NGUYÊN TẮC CỐT LÕI

| Mã Lỗi | Tên Tình Huống | Hành Vi Bắt Buộc Của Hệ Thống |
|---|---|---|
| `ERR_INSUFFICIENT_EVIDENCE` | Thiếu căn cứ kiểm chứng | Nếu độ trùng khớp trích dẫn (NFKC SequenceMatcher) $< 80\%$, Agent **nghiêm cấm suy đoán** và phải phản hồi thông điệp chuẩn: *"Dữ liệu hiện tại không đủ căn cứ để xác nhận thông tin này."* |
| `ERR_CIRCUIT_OPEN` | LLM Provider bị gián đoạn/quá tải | Chuyển sang mô hình dự phòng (Google Gemini / vLLM) hoặc kích hoạt Fallback Engine ngoại tuyến trả lời các câu hỏi FAQ thường gặp. |
| `ERR_MUTATION_HIGH_VALUE` | Giao dịch vượt ngưỡng tài chính | Nếu giá trị giao dịch $\ge 10.000.000$ VNĐ, Agent không được tự ý thực thi mà phải đóng băng và chuyển vào hàng đợi `WAITING_HUMAN_APPROVAL` cho chuyên viên duyệt. |
| `ERR_AST_INJECTION` | Phát hiện mã độc AST / Injection | Chặn ngay tại tầng Static Scanner, ghi nhận sự kiện vi phạm an ninh (Security Audit Event) và từ chối xử lý lệnh. |
| `ERR_FAILED_CLOSED` | Lỗi phân quyền hoặc mất kết nối SSOT | Mặc định từ chối giao dịch (Fail-Closed) để bảo toàn tính toàn vẹn của kho và số dư. |

---

## 2. QUY CHUẨN MÃ TRẢ VỀ (ERROR CODES)

```json
{
  "status": "error",
  "error_code": "INSUFFICIENT_EVIDENCE",
  "correlation_id": "req-98f5a6b2-c124-4f21",
  "message": "Không tìm thấy đủ căn cứ chứng thực trong tài liệu quy định của công ty.",
  "grounding_score": 0.54,
  "threshold_required": 0.80
}
```
