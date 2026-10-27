# QUY CHẾ QUẢN TRỊ TÀI CHÍNH & HẠN MỨC BỒI HOÀN 2026

**Mã văn bản:** POL_2026_REFUND  
**Căn cứ:** Điều 5  
**Số trang:** 12  
**Đơn vị ban hành:** Ban Giám đốc Tài chính RetailMind AI & Khối Bán lẻ MWG

---

## ĐIỀU 5. PHÂN TẦNG THẨM QUYỀN PHÊ DUYỆT BỒI HOÀN TÀI CHÍNH

Nhằm đảm bảo an toàn tài chính và tuân thủ nguyên tắc Single Source of Truth, mọi giao dịch bồi hoàn hoặc thanh toán phải tuân thủ nghiêm ngặt 3 phân tầng hạn mức sau:

### 1. Tầng 1: Hạn mức tự động AI (Dưới hoặc bằng 200.000 VNĐ)
- **Hạn mức:** Giá trị từ **200.000 VNĐ** trở xuống.
- **Cơ chế xử lý:** Hệ thống AI tự động xử lý và giải ngân (`allow`) ngay sau khi xác thực thông tin đơn hàng và nguyên nhân bồi hoàn.
- **Ví dụ áp dụng:** Bồi thường giao hàng chậm trễ dưới 2 giờ, mã giảm giá bị lỗi kích hoạt, bù chênh lệch cước vận chuyển.

### 2. Tầng 2: Hạn mức phê duyệt Quản lý — HITL Gate (Từ 200.000 đến 2.000.000 VNĐ)
- **Hạn mức:** Các khoản thanh toán từ trên **200.000 VNĐ** đến **2.000.000 VNĐ**.
- **Cơ chế xử lý:** Bắt buộc phải qua sự phê duyệt của Quản lý trực tiếp (Human-In-The-Loop Gate — `require_approval`, approver_role: `admin`).
- **Thời hạn phê duyệt:** Trong vòng 24 giờ kể từ thời điểm phát sinh yêu cầu.
- **Trạng thái:** Tác vụ được đưa vào hàng đợi `PENDING` chờ quản lý xác nhận trước khi tiền được chuyển đi.

### 3. Tầng 3: Hạn mức Phòng Tài chính (Vượt quá 2.000.000 VNĐ)
- **Hạn mức:** Khoản thanh toán vượt quá **2.000.000 VNĐ**.
- **Cơ chế xử lý:** Hệ thống AI tự động từ chối xử lý trực tiếp (`deny`). Yêu cầu bắt buộc phải chuyển hồ sơ sang Phòng Tài chính thẩm định và ký duyệt thủ công theo quy trình kế toán doanh nghiệp.
- **Lý do từ chối:** "Khoản bồi hoàn vượt quá hạn mức tối đa cho phép của cửa hàng (2.000.000 VNĐ). Yêu cầu chuyển hồ sơ sang Phòng Tài chính thẩm định."
