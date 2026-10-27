# 📐 Wireframe Specifications & Visual Layout Blueprints (Khung Dây Giao Diện Bán Lẻ)

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/06-frontend/wireframe/README.md`  
**Phiên bản**: Production 2026 Edition  
**Quy chuẩn**: Dual-Shell Architecture (Commerce Shell & Admin Shell), Minimal Tech & Disciplined Geometry  

> Thư mục lưu trữ các bản phác thảo khung dây giao diện (Wireframe Blueprints) dưới định dạng ASCII Art và cấu trúc thành phần UI, làm cơ sở chuẩn mực cho kỹ sư Frontend và kiểm thử viên E2E triển khai.

---

## 1. SƠ ĐỒ KHUNG DÂY: TRANG CHỦ & TÌM KIẾM NGỮ NGHĨA (`SCR-02`)

```text
+-------------------------------------------------------------------------------------------------------+
| [LOGO] RetailMind.AI (MWG) | [Ô tìm kiếm ngữ nghĩa: "Laptop dưới 20tr có RAM 16GB"...] | [Cart(3)] | [Avatar] |
+-------------------------------------------------------------------------------------------------------+
| HERO SECTION:                                                                                         |
|   TRÍ TUỆ BÁN LẺ ĐA KÊNH THẾ HỆ MỚI 2026                 +-----------------------------------------+  |
|   Tư vấn cấu hình chuẩn xác • Bảo hành 24 tháng chính hãng| [Tranh 3D: hero-exam-orbit-3d.png]     |  |
|   [ NÚT CTA: Khám Phá Danh Mục Ngay ]  [ Hỏi Trợ Lý AI ]  | Quỹ đạo sản phẩm & AI phát quang        |  |
|                                                           +-----------------------------------------+  |
+-------------------------------------------------------------------------------------------------------+
| CAM KẾT CHẤT LƯỢNG VÀNG:                                                                              |
|   [✓ Đổi mới 30 ngày miễn phí]      [✓ Giá niêm yết PostgreSQL SSOT]     [✓ Tồn kho thật tại chi nhánh] |
+-------------------------------------------------------------------------------------------------------+
| DANH MỤC LAPTOP NỔI BẬT:                                                                               |
|   +-----------------------+ +-----------------------+ +-----------------------+ +--------------------+ |
|   | [Ảnh] Asus Vivobook 15| | [Ảnh] Dell Inspiron 14| | [Ảnh] ThinkBook 14 G6+| | [Ảnh] Acer Swift Go| |
|   | Core i5 • RAM 16GB    | | Core i5 • RAM 16GB    | | Ultra 5 AI • RAM 16GB | | Core i5 • RAM 16GB | |
|   | 17.990.000 ₫          | | 18.490.000 ₫          | | 19.990.000 ₫          | | 16.990.000 ₫       |
|   | [Đặt hàng] [So sánh]  | | [Đặt hàng] [So sánh]  | | [Đặt hàng] [So sánh]  | | [Đặt hàng] [So sánh] |
|   +-----------------------+ +-----------------------+ +-----------------------+ +--------------------+ |
+-------------------------------------------------------------------------------------------------------+
```

---

## 2. SƠ ĐỒ KHUNG DÂY: DANH MỤC & BỘ LỌC ĐA CHIỀU (`SCR-03`)

```text
+-------------------------------------------------------------------------------------------------------+
| [TOP BAR: Logo, Omni Search, Phân hệ Khách hàng, Giỏ hàng, Tài khoản]                                 |
+--------------------+----------------------------------------------------------------------------------+
| SIDEBAR BỘ LỌC:    | DANH SÁCH SẢN PHẨM LAPTOP (Hiển thị 24 sản phẩm)         [Sắp xếp: Giá tăng dần v]|
|                    |                                                                                  |
| Khoảng giá (VNĐ):  | +------------------------------------------------------------------------------+ |
| [===o========]     | | [Ảnh 3D] Laptop Asus Vivobook 15 OLED A1505VA               [Còn 12 máy tại Q1]| |
| 10tr - 20tr        | | Vi xử lý: Intel Core i5-13500H | RAM: 16GB DDR4 | SSD: 512GB NVMe            | |
|                    | | Màn hình: 15.6" OLED 2.8K 120Hz rực rỡ • Đổi trả 30 ngày • BH 24 tháng       | |
| Thương hiệu:       | | Giá niêm yết (SSOT): 17.990.000 ₫                       [ + ĐẶT MUA ] [So Sánh]| |
| [x] Asus   [ ] Dell| +------------------------------------------------------------------------------+ |
| [x] Lenovo [ ] Acer| | [Ảnh 3D] Laptop Dell Inspiron 14 5430                       [Còn 8 máy tại ĐĐ]| |
|                    | | Vi xử lý: Intel Core i5-1335U | RAM: 16GB LPDDR5 | SSD: 512GB NVMe           | |
| Bộ nhớ RAM:        | | Khung nhôm nguyên khối • Bảo hành tận nơi 12 tháng                           | |
| [ ] 8GB    [x] 16GB| | Giá niêm yết (SSOT): 18.490.000 ₫                       [ + ĐẶT MUA ] [So Sánh]| |
| [ ] 32GB           | +------------------------------------------------------------------------------+ |
|                    | [<< Trang trước]                  Trang 1 / 4                      [Trang sau >>]|
+--------------------+----------------------------------------------------------------------------------+
```

---

## 3. SƠ ĐỒ KHUNG DÂY: CHI TIẾT SẢN PHẨM & TỒN KHO CHI NHÁNH (`SCR-04`)

```text
+-------------------------------------------------------------------------------------------------------+
| Breadcrumbs: Trang Chủ > Laptop > Asus > Asus Vivobook 15 OLED A1505VA                                 |
+---------------------------------------------------+---------------------------------------------------+
| KHUNG HÌNH ẢNH 3D ĐA GÓC NHÌN:                    | THÔNG TIN SẢN PHẨM & GIÁ NIÊM YẾT:                |
| +-----------------------------------------------+ | Tên máy: Laptop Asus Vivobook 15 OLED A1505VA    |
| |                                               | | SKU: LT-ASUS-VIVO15-OLED • Đánh giá: ★★★★★ (4.9)  |
| |             [ Ảnh Render Lớn ]                | |                                                   |
| |                                               | | Giá niêm yết (SSOT): 17.990.000 ₫ (Tiết kiệm 2tr)|
| +-----------------------------------------------+ | Mã giảm giá: [MWG_VIP500] giảm thêm 500.000 ₫     |
| [Thumb 1] [Thumb 2] [Thumb 3] [Góc 360 độ]       |                                                   |
|                                                   | CHỌN ĐIỂM NHẬN SIÊU THỊ CÒN HÀNG (MWG HUBS):      |
|                                                   | [x] 136 Nguyễn Thái Học, Q.1, TP.HCM  (Còn 12 máy)|
|                                                   | [ ] 117 Thái Hà, Đống Đa, Hà Nội     (Còn 8 máy)  |
|                                                   | [ ] 320 đường 2/9, Hải Châu, Đà Nẵng (Còn 5 máy)  |
|                                                   |                                                   |
|                                                   | [ NÚT LỚN: MUA NGAY (Giao tận nơi hoặc nhận quầy)]|
|                                                   | [ NÚT PHỤ: THÊM VÀO GIỎ HÀNG ]                    |
+---------------------------------------------------+---------------------------------------------------+
| BẢNG THÔNG SỐ KỸ THUẬT CHI TIẾT:                  | CHÍNH SÁCH BẢO HÀNH & ĐỔI TRẢ 30 NGÀY:            |
| • Vi xử lý: Intel Core i5-13500H (12 nhân/16 luồng)| • Đổi máy mới miễn phí 100% trong 30 ngày đầu     |
| • RAM: 16GB DDR4 3200MHz (Hỗ trợ nâng cấp 24GB)  | • Bảo hành chính hãng 24 tháng toàn quốc          |
| • Ổ cứng: 512GB M.2 PCIe Gen 4 SSD                | • Cam kết hoàn tiền nếu sản phẩm không đúng mô tả |
+---------------------------------------------------+---------------------------------------------------+
```

---

## 4. SƠ ĐỒ KHUNG DÂY: CỬA SỔ TRỢ LÝ TƯ VẤN AI SHOPPING ADVISOR (`SCR-06`)

```text
+-------------------------------------------------------------------------------------------------------+
| [HEADER ADVISOR] RetailMind.AI Advisor | Phản hồi theo thời gian thực | [Thu gọn _] [Đóng X]          |
+-------------------------------------------------------------------------------------------------------+
| NỘI DUNG CUỘC TRÒ CHUYỆN (STREAMING SSE CHAT THREAD):                                                 |
|                                                                                                       |
| Khách hàng: "Tư vấn giúp em laptop học lập trình & đồ họa nhẹ tầm 18-20 triệu có sẵn hàng ở Q1"      |
|                                                                                                       |
| Advisor: "Chào bạn! Trong tầm giá 18-20 triệu có sẵn hàng tại 136 Nguyễn Thái Học, Q.1, tôi gợi ý:"  |
|                                                                                                       |
| +---------------------------------------------------------------------------------------------------+ |
| | [Ảnh] Laptop Asus Vivobook 15 OLED A1505VA (Core i5-13500H, RAM 16GB) | Còn 12 máy tại Q1         | |
| | Giá niêm yết: 17.990.000 ₫                                             [Xem máy] [Thêm vào giỏ]   | |
| +---------------------------------------------------------------------------------------------------+ |
| | [Ảnh] Laptop Lenovo ThinkBook 14 G6+ (Core Ultra 5 125H AI NPU)        | Còn 7 máy tại Q1          | |
| | Giá niêm yết: 19.990.000 ₫                                             [Xem máy] [Thêm vào giỏ]   | |
| +---------------------------------------------------------------------------------------------------+ |
|                                                                                                       |
| [📖 Căn cứ: Quy chế bán lẻ & Danh mục tồn kho MWG 2026 (Điều 1 & 5)] [Grounding Score: 98% Đạt]      |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
| HARNESS AUDIT TRAIL (10 LỚP KIỂM SOÁT):                                                               |
| [1] L0-RateLimiter: 1/30 req | [2] L1-VectorCache: Miss | [3] L4-LangGraph: 2 Tools Called (CheckStock)|
+-------------------------------------------------------------------------------------------------------+
| [GỢI Ý NHANH]: [Laptop dưới 20M RAM 16GB] [Chính sách đổi trả 30 ngày] [Mức phạt vi phạm Điều 301]    |
| [Nhập câu hỏi hoặc yêu cầu tư vấn kỹ thuật...                                         ] [ NÚT GỬI > ] |
+-------------------------------------------------------------------------------------------------------+
```

---

## 5. SƠ ĐỒ KHUNG DÂY: GIỎ HÀNG & CHỐT ĐƠN KHÓA TỒN SSOT (`SCR-07` & `SCR-08`)

```text
+-------------------------------------------------------------------------------------------------------+
| BREADCRUMBS: Giỏ Hàng > Thông Tin Thanh Toán > Hoàn Tất Đơn Hàng                                      |
+---------------------------------------------------+---------------------------------------------------+
| CỘT TRÁI: SẢN PHẨM & ĐIỂM NHẬN HÀNG               | CỘT PHẢI: BẢNG TÍNH TIỀN CHÍNH XÁC (SSOT)         |
|                                                   |                                                   |
| 1. Danh sách sản phẩm trong giỏ (1 món):          | Tạm tính (1 máy):                 17.990.000 ₫    |
| +-----------------------------------------------+ | Giảm giá voucher [MWG_VIP500]:      -500.000 ₫    |
| | [Ảnh] Asus Vivobook 15 OLED A1505VA           | | Thuế GTGT (VAT 10%):              +1.749.000 ₫    |
| | Đơn giá: 17.990.000 ₫                         | | ---------------------------------------------   |
| | Số lượng: [ - ]  1  [ + ] (Tồn kho tối đa: 12)| | TỔNG CỘNG THANH TOÁN (VNĐ):       19.239.000 ₫    |
| +-----------------------------------------------+ |                                                   |
|                                                   | [✓ Khóa bi quan chống bán vượt tồn SELECT FOR U.] |
| 2. Chọn hình thức nhận máy:                       | [✓ Bảo vệ chống gửi đúp bởi Idempotency-Key]      |
| (•) Nhận tại siêu thị Thế Giới Di Động gần nhất   |                                                   |
|     Chi nhánh: [136 Nguyễn Thái Học, Q.1, TP.HCM] | [ NÚT CHÍNH: XÁC NHẬN ĐẶT HÀNG (1-CLICK ORDER) ]  |
| ( ) Giao hàng tận nơi miễn phí (30 phút)          |                                                   |
|     Địa chỉ: [Nhập số nhà, tên đường...]          | [Đồng hồ đếm ngược giữ tồn: 09:45 còn hiệu lực]   |
+---------------------------------------------------+---------------------------------------------------+
```

---

## 6. SƠ ĐỒ KHUNG DÂY: BẢNG ĐIỀU KHIỂN QUẢN TRỊ VIÊN & FINOPS (`SCR-14`)

```text
+-------------------------------------------------------------------------------------------------------+
| [LOGO] RetailMind Admin | [Tìm kiếm đơn hàng, SKU...] | [Chuông báo (2)] | [Nguyễn Quản Trị (ADMIN01)]|
+----------+--------------------------------------------------------------------------------------------+
| SIDEBAR  | BẢNG ĐIỀU KHIỂN TỔNG QUAN DOANH NGHIỆP (EXECUTIVE METRICS)                                  |
|          |                                                                                            |
| [•] Tổng | [ DOANH SỐ HÔM NAY ]    [ ĐƠN HÀNG MỚI ]    [ CHI PHÍ TOKEN AI ]    [ TỶ LỆ TRẢ LỜI ĐÚNG ] |
| [ ] Kho  | 142.500.000 ₫           18 đơn mới          $0.0345 USD             99.4% Grounding Score  |
| [ ] Đơn  | (+12% so hôm qua)       (3 đơn chờ giữ kho) (DuckDB FinOps)         (Zero Hallucination)   |
| [ ] HITL +--------------------------------------------------------------------------------------------+
| [ ] RAG  | HÀNG ĐỢI PHÊ DUYỆT TÁC VỤ CON NGƯỜI (HITL GATE CẦN XỬ LÝ: 1 TÁC VỤ)      [Xem tất cả >]    |
| [ ] Traces | • Task #8821: Bồi hoàn 500.000 ₫ cho khách vì giao trễ 2h      [Từ Chối] [Phê Duyệt Ngay]|
| [ ] RBAC +--------------------------------------------------------------------------------------------+
|          | ĐƠN HÀNG VÀ TỒN KHO VẬN HÀNH THỜI GIAN THỰC (REAL-TIME ACTIVITY):                          |
|          | +----------------------------------------------------------------------------------------+ |
|          | | Mã Đơn            | Khách Hàng      | Sản Phẩm           | Tổng Tiền    | Trạng Thái   | |
|          | | MWG-20261026-9812 | Trần Minh Đức   | Asus Vivobook 15   | 19.239.000 ₫ | [Đã Giữ Kho] | |
|          | | MWG-20261026-9811 | Lê Thu Hà       | ThinkBook 14 G6+   | 21.439.000 ₫ | [Đang Giao]  | |
|          | +----------------------------------------------------------------------------------------+ |
+----------+--------------------------------------------------------------------------------------------+
```

---

## 7. SƠ ĐỒ KHUNG DÂY: MA TRẬN QUẢN LÝ TỒN KHO ĐA CHI NHÁNH (`SCR-16`)

```text
+-------------------------------------------------------------------------------------------------------+
| QUẢN LÝ TỒN KHO CHI NHÁNH ĐA KÊNH | Chi nhánh: [ 136 Nguyễn Thái Học, Q.1 v] | [ + Điều chuyển kho ]  |
+-------------------------------------------------------------------------------------------------------+
| [Bộ lọc: Tất cả | Sắp hết hàng | Đang khóa giữ chỗ]               [Ô tìm kiếm: SKU, tên laptop...]    |
|                                                                                                       |
| +---------------------------------------------------------------------------------------------------+ |
| | Mã SKU             | Tên Laptop Mẫu          | Tồn Vật Lý | Tồn Khóa Giữ | Tồn Khả Dụng | Trạng Thái  | |
| | LT-ASUS-VIVO15-OLED| Asus Vivobook 15 OLED   | 15 máy     | 3 máy        | 12 máy       | [Đủ hàng]   | |
| | LT-DELL-INSP14-5430| Dell Inspiron 14 5430   | 10 máy     | 2 máy        | 8 máy        | [Đủ hàng]   | |
| | LT-LENOVO-TB14-G6  | Lenovo ThinkBook 14 G6+ | 4 máy      | 2 máy        | 2 máy        | [SẮP HẾT ⚠️]| |
| | LT-ACER-SWIFT-GO14 | Acer Swift Go 14 OLED   | 2 máy      | 2 máy        | 0 máy        | [HẾT HÀNG 🚫]| |
| +---------------------------------------------------------------------------------------------------+ |
| [Cơ chế: SELECT ... FOR UPDATE khóa bi quan trong Transaction CSDL PostgreSQL - Chống Overselling 100%]|
+-------------------------------------------------------------------------------------------------------+
```

---

## 8. SƠ ĐỒ KHUNG DÂY: CỔNG PHÊ DUYỆT TÁC VỤ CON NGƯỜI HITL GATE (`SCR-18`)

```text
+-------------------------------------------------------------------------------------------------------+
| CỔNG PHÊ DUYỆT TÁC VỤ CON NGƯỜI (HUMAN-IN-THE-LOOP APPROVAL GATE) - ĐIỀU 10 ĐẠO LUẬT AI               |
+-------------------------------------------------------------------------------------------------------+
| Quy tắc an toàn: Mọi thao tác tài chính > 200.000 ₫ hoặc can thiệp chính sách bắt buộc Quản lý duyệt  |
|                                                                                                       |
| +---------------------------------------------------------------------------------------------------+ |
| | TÁC VỤ CHỜ DUYỆT: #task-hitl-8821                              [Trạng thái: PENDING (Chờ duyệt)]  | |
| | Khách hàng: Nguyễn Văn Hùng (SĐT: 0908***881) • Đơn hàng: MWG-20261026-9812                        | |
| | Hành động nhạy cảm yêu cầu: BỒI HOÀN 500.000 VNĐ VÀO VÍ KHÁCH HÀNG                                 | |
| | Lý do phát sinh: Giao hàng trễ hơn cam kết 2.5 giờ do thời tiết mưa lớn.                          | |
| | Căn cứ kích hoạt HITL: Giá trị bồi hoàn 500.000 ₫ vượt hạn mức AI tự duyệt (200.000 ₫).           | |
| |                                                                                                   | |
| | [ NÚT HỒNG: TỪ CHỐI YÊU CẦU ]           [ NÚT XANH JADE: PHÊ DUYỆT CHO PHÉP THỰC THI (Xác thực) ] | |
| +---------------------------------------------------------------------------------------------------+ |
| Mọi quyết định phê duyệt đều được ghi nhận vào Sổ cái bất biến SHA-256 (Tamper-Evident Hash Chain).   |
+-------------------------------------------------------------------------------------------------------+
```
