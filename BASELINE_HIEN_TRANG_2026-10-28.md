# Kiểm kê hiện trạng và đối chiếu Design Baseline v1

Ngày kiểm kê: 28/10/2026  
Phạm vi: 12 use case, phân quyền, checkout và ranh giới Agent.  
Loại bằng chứng: đọc tài liệu và khảo sát mã nguồn có mục tiêu; không phải kiểm toán toàn bộ hoặc chứng nhận runtime. Không thay đổi code, baseline gốc hay phê duyệt thay người dùng.

## 1. Trạng thái phê duyệt và cách đọc báo cáo

- **Xác nhận từ người dùng:** trong cuộc trao đổi ngày 28/10/2026, người dùng trả lời **“Đã phê duyệt”** khi được hỏi liệu Design Baseline v1 đã được phê duyệt chính thức trước cuộc trao đổi này ở nơi khác hay chưa.
- **Hồ sơ trong repo:** `enterprise-docs/docs/03-architecture-api/00-DESIGN_REVIEW.md` ghi `REVIEWED — RECOMMEND APPROVAL`; `enterprise-docs/docs/11-governance-progress/01-DESIGN_BASELINE_SHA256.md` ghi người phê duyệt đang chờ ký. Các nhãn `APPROVED` trong ADR/sổ quyết định không tự chứng minh biên bản sign-off của Product Owner.
- **Chưa biết:** thời điểm, nơi lưu biên bản và chính xác bộ file/hash đã được phê duyệt. Không suy ra bản kiểm kê này hoặc các thay đổi sau đó đã được phê duyệt. Bản SHA liệt kê các đường dẫn `docs/...` cũ; chưa xác minh hash hoặc tính tương đương với file đã chuyển vào `enterprise-docs/`.
- **Trạng thái gate:** người dùng xác nhận đã có phê duyệt trước đây; hồ sơ repository **chưa đồng bộ**. Báo cáo này là kiểm kê bổ sung, không thay thế bản thiết kế được duyệt và không tự thay đổi gate.
- **Quy ước:** `IN_PROGRESS` = đã tìm thấy một phần mã nhưng chưa xác minh đầy đủ hợp đồng; `NOT_RUN` = chưa chạy kiểm thử tương ứng; `BLOCKED` = một yêu cầu bị cản bởi thiếu thông tin hoặc điều kiện kiểm thử. Không dùng `DONE` dựa trên tên file, trang hoặc mock.
- Nguồn yêu cầu cho bảng: `enterprise-docs/docs/01-requirements/04-USE_CASES.md`; quy tắc ưu tiên là `AGENTS.md`. Những phần chưa được tìm thấy trong các đường đi đã khảo sát được ghi cụ thể, không khẳng định vắng mặt khỏi toàn repo.

## 2. Ma trận 12 use case

| UC | Yêu cầu chính | Đã thấy trong mã | Khoảng trống / bằng chứng còn thiếu | Trạng thái |
|---|---|---|---|---|
| UC01 | Đăng ký, đăng nhập, phiên JWT | `core-api/src/features/auth/auth.controller.ts`, `auth.service.ts`: register/login/refresh/logout; Argon2, JWT. | `login` chỉ verify khi có cả password và passwordHash; fallback user/role tồn tại. Không thấy guard được áp cho controller hay toàn cục; `/me` có ID mặc định. Chưa kiểm thử session, revoke, rate limit và JWT end-to-end. | IN_PROGRESS; NOT_RUN |
| UC02 | Duyệt/lọc catalog | `catalog.controller.ts`, `catalog.service.ts`, trang `web-client/src/app/catalog/page.tsx`; có lọc và nhánh repository. | Có dữ liệu fallback; controller trả items/total, chưa thấy hợp đồng phân trang UC02 tại endpoint được khảo sát. Chưa chứng minh dữ liệu live hay UI/API parity. | IN_PROGRESS; NOT_RUN |
| UC03 | Tư vấn, so sánh, SSE | `agent-system/src/agent_platform/api/routers/chat.py`, `web_client.py`, workflow và tool executor; `core-api/src/features/internal-agent/`. | Xác thực principal chưa đáng tin; chưa chứng minh LLM, tool, backend và UI nối xuyên suốt, giới hạn bước và dữ liệu nguồn. Tài liệu UC03 yêu cầu customer, AGENTS cho phép guest chat ẩn danh. | IN_PROGRESS; NOT_RUN |
| UC04 | Tra cứu giá/tồn theo cửa hàng | `inventory.controller.ts` có stores/stock; `inventory.service.ts` có nhánh DB và tính available. | API route khác đặc tả; có inventory mặc định trong bộ nhớ. Chưa xác minh giá/tồn UI lấy từ PostgreSQL với dữ liệu thực. Endpoint reserve cũng chưa thấy guard. | IN_PROGRESS; NOT_RUN |
| UC05 | Hỏi đáp chính sách có nguồn | `knowledge.service.ts`, `rag/retrieval/hybrid_engine.py`, endpoint policy search và UI warranty. | Search backend có fallback chính sách; chưa tìm được bằng chứng đường đi Qdrant → kiểm tra PostgreSQL `published` theo chunk/version → trích dẫn/abstain trong luồng đã khảo sát. Không chứng minh chất lượng grounding. | IN_PROGRESS; NOT_RUN |
| UC06 | Lịch sử chat và favorites theo chủ sở hữu | `customers.controller.ts`, `customers.service.ts`, entity conversation/message; favorites có nhánh repository. | Controller chấp nhận `x-customer-id` và ID mặc định; chưa chứng minh danh sách/lịch sử chat cá nhân và ownership từ đầu đến cuối. | IN_PROGRESS; NOT_RUN |
| UC07 | Giỏ hàng Customer bền vững | Entity `Cart`, `CartItem`; `internal-agent.service.ts` có view/add/remove cart. | Tool cart được lưu `Map` trong bộ nhớ; chưa xác minh CRUD cart PostgreSQL, guard ownership và đồng bộ UI/backend. | IN_PROGRESS; NOT_RUN |
| UC08 | Preview token, confirm có idempotency, transaction | `orders.service.ts`, `preview-token.helper.ts`, `inventory.service.ts` có Decimal, token HMAC, transaction và pessimistic lock. | Token optional, chỉ đối chiếu store; idempotency Map; không lưu order items trong đoạn checkout; getOrder dùng Map. `web-client/src/features/checkout/services/order.action.ts` tự tạo receipt. Chi tiết ở mục 4. | IN_PROGRESS; NOT_RUN |
| UC09 | Tra cứu/hủy đơn và hoàn tồn | `orders.controller.ts` có get; `orders.service.ts` có cancel; internal tool gọi hủy. | Get/cancel dùng Map; cancel chỉ đổi trạng thái trong Map, không gọi restoreStockInTx, dù thông báo nói hoàn tồn. Chưa thấy route hủy customer trong OrdersController; ownership chưa bảo đảm. | IN_PROGRESS; NOT_RUN |
| UC10 | Customer tạo/theo dõi support ticket | `support.controller.ts`, `support.service.ts` có create/list/get; service kiểm tra customer ID khi đọc một ticket. | Customer ID từ header/default khi thiếu principal; chưa chứng minh xác thực và kiểm tra quyền sở hữu order liên quan. Có fallback Map. | IN_PROGRESS; NOT_RUN |
| UC11 | Admin quản trị catalog/tồn và audit | Có trang admin, inventory service, audit module/controller. | Catalog controller khảo sát chỉ có GET; chưa xác minh luồng CRUD admin và audit mọi thay đổi. `@Roles` không đủ nếu guard không được áp; reserve inventory có endpoint không thấy guard. | IN_PROGRESS; NOT_RUN |
| UC12 | Admin quản lý tri thức, ticket và eval | `knowledge.controller.ts` upload, ingestion producer, trang admin; agent có HITL/eval. | `@Roles` trên upload chưa thấy guard áp dụng; chưa chứng minh publish/supersede, xử lý ticket admin, kiểm soát HITL và eval thật. Có chức năng refund/policy mở rộng cần xác nhận phạm vi. | IN_PROGRESS; NOT_RUN |

## 3. Ma trận phân quyền hiện trạng

| Persona / tài nguyên | Baseline | Quan sát mã / hậu quả cần xác minh |
|---|---|---|
| Guest | Catalog, tồn, tư vấn AI ẩn danh; không checkout | `OrdersController` không thấy guard; checkout cho phép `customerId` mặc định. Chưa đạt ranh giới yêu cầu. |
| Customer | Chỉ tài nguyên của mình | Customers/support đọc ID từ `x-customer-id` hoặc giá trị mặc định; service ticket có so ID nhưng nguồn ID chưa đáng tin. Orders get không nhận principal. Không thể xem đây là bảo vệ IDOR đầy đủ. |
| Admin backend | Chỉ admin quản trị, upload và audit | `@Roles('ADMIN')` trên audit/knowledge; `app.module.ts` không đăng ký `APP_GUARD`, và tìm kiếm `@UseGuards` chỉ thấy internal-agent áp dụng secret guard. Metadata không tự thực thi nếu thiếu guard. Cần kiểm thử HTTP thực tế. |
| Admin Agent | Chỉ admin đáng tin duyệt HITL | `api/deps.py` nhận role từ token `dev:`; JWT decode chỉ là comment. Các route `/api/hitl/...` trong `web_client.py` không khai báo auth dependency và tự nhận reviewer từ request. Cần kiểm thử theo route/triển khai; route `/v1` khác có `require_role` nhưng phụ thuộc principal chưa xác thực. |
| Giao diện admin | Điều hướng theo vai trò | `web-client/src/middleware.ts` dùng cookie role, mặc định admin, strict mode opt-in. Không phải nguồn xác thực hoặc authorization server-side. |
| Internal tools | Backend phải xác thực cả service và quyền người dùng | `internal-agent.controller.ts` có `InternalSecretGuard`; cần xác minh principal truyền qua và backend kiểm tra ownership cho từng side effect. Secret service không thay thế quyền của customer. |

## 4. Đối chiếu checkout

**Yêu cầu UC08:** Customer đã xác thực, giỏ hợp lệ, preview có token 10 phút ràng buộc nội dung/giá, người dùng confirm, UUIDv4 idempotency key bền vững, transaction khóa inventory, lưu order + order item snapshot + chuyển cart và key, rollback khi lỗi. Không suy ra đã đạt chỉ vì có `setLock`.

**Đã thấy:**
- Backend tính tiền bằng `decimal.js`; helper ký HMAC và kiểm tra hạn; nhánh datasource mở transaction, gọi `reserveMultipleWithLock`, sắp xếp variant trước khi dùng `pessimistic_write`, sau đó lưu order.
- Có entity `OrderItem`, `IdempotencyKey`, `Cart`, `CartItem` và hàm `restoreStockInTx`; sự hiện diện không chứng minh chúng tham gia transaction.

**Chênh lệch cụ thể:**
1. `OrdersController` nhận key qua header hoặc body, không thấy validate UUIDv4. `previewToken` optional; khi có, checkout xác thực chữ ký/hạn rồi chỉ so `storeId`, không so customer/items/tổng tiền với request. Giá được tính lại trước transaction; chưa chứng minh xử lý thay đổi giá an toàn.
2. Cache key là `Map` trong `OrdersService`, kiểm tra trước khi xử lý và ghi sau commit. Không có bằng chứng serialize cùng key đang xử lý, chịu restart hoặc nhiều instance; không thấy ràng buộc key với principal/payload.
3. Đoạn transaction khảo sát lưu `Order` nhưng không lưu `OrderItem`, chuyển cart, hoặc lưu idempotency key. `orderId` trả về được sinh riêng bằng thời gian; `getOrder` đọc Map thay vì đọc order DB. Cần kiểm thử đối chiếu ID trả về với ID persist.
4. Không có datasource thì fallback giữ tồn trong bộ nhớ; với nhiều món, lỗi giữa chừng chưa thấy rollback các thay đổi trước đó. Endpoint `inventory/reserve` cũng có thể gọi trực tiếp mà không thấy guard.
5. `cancelOrder` đổi status Map nhưng không gọi hàm hoàn tồn; thông báo thành công không phải bằng chứng hoàn tồn.
6. Frontend `confirmOrderAction` dùng catalog tĩnh và tự sinh receipt, không gọi backend trong hàm này; preview frontend dùng token giả và quy tắc voucher khác backend (`BACK2SCHOOL` 300.000 có ngưỡng ở frontend, 500.000 ở backend). Trang `web-client/src/app/checkout/page.tsx` gọi trực tiếp action này; chưa kiểm thử runtime hoặc khẳng định mọi đường tạo đơn khác đều như vậy.
7. Helper có secret fallback cố định; cần xác minh cấu hình thực tế và fail-closed ở môi trường triển khai.

**Chưa kiểm thử:** PostgreSQL thật, 2 request cùng key, oversell với nhiều transaction, rollback, restart/multi-instance, price change, cancellation/stock release, guest/customer IDOR và UI→backend→DB.

## 5. Ranh giới Agent

- **Đã có cấu trúc:** `ToolExecutor` có Pydantic input, kiểm tra role/policy và HITL; backend có internal tool controller với shared-secret guard; có workflow và PII masker. Đây là các thành phần, chưa chứng minh enforcement xuyên suốt.
- **Principal:** `api/deps.py` cho phép token dev tự đặt role; token khác được xem như user ID, không xác thực JWT. `web_client.py` có đường tạo principal riêng, kể cả khi không có Bearer. Các route `/api/hitl/review`, `/approve`, `/reject` khảo sát không có `Depends(require_role(...))` và reviewer do request cung cấp. Route `/v1` có dependency nhưng vẫn dựa vào principal yếu.
- **PII:** `PIIMasker` có trong `harness/guards/pii.py`; tìm kiếm source chỉ thấy định nghĩa/export, không thấy gọi `.mask()` hay `PIIMasker` trong luồng. `InputSanitizer` chỉ chuẩn hóa Unicode/xóa ký tự vô hình. Chưa thể nói PII được che trước provider; cũng không suy ra regex bao phủ mọi định dạng.
- **DB và tool:** có PostgreSQL KV adapter tùy chọn trong Agent và DuckDB cho ingestion; chưa thấy bằng chứng Agent dùng adapter đó để truy cập bảng commerce lõi. Cần chốt rõ phân biệt persistence riêng của agent với quyền trực tiếp vào core database, và kiểm tra cấu hình runtime/credentials. Qdrant retrieval code tồn tại, chưa chứng minh lọc version published.
- **Phạm vi:** `domains/retail_store/tools.py` và policies có `request_return_or_refund`, ngưỡng bồi hoàn và HITL; nội dung quản lý tài chính trong fallback. Cần đối chiếu 12 UC và quyết định đây là mô phỏng nằm trong UC12 hay là mở rộng cần RFC. Chưa chứng minh có thanh toán/hoàn tiền thật.
- **Fallback:** `harness/__init__.py` có fallback MockLLM; cần phân biệt kết quả mock với live provider, và quy định hiển thị/fail-closed khi hệ thống phục vụ người dùng.

## 6. Quyết định cần làm rõ và đề xuất

1. **Bằng chứng sign-off:** người dùng đã xác nhận phê duyệt trước đây; đề nghị bổ sung khi có thời điểm, nơi lưu và bộ file/hash được duyệt. Không tự ghi chữ ký hoặc đổi trạng thái tài liệu gốc khi chưa có các chi tiết đó.
2. **Nguồn quy hoạch:** AGENTS quy định phase 0–8; `PLANS.md` là 0–9; README mô tả package đặc tả cũ. Đề xuất thống nhất một roadmap và ghi mapping các hạng mục đã triển khai. Không tự chọn lại số phase.
3. **Guest AI:** AGENTS cho phép chat ẩn danh, UC03 ghi Customer đã đăng nhập. Cần chốt guest có được tư vấn sản phẩm không, guest session sống bao lâu và có được lưu lịch sử hay không.
4. **Checkout:** đặc tả dùng `/orders/confirm`, code dùng `/orders/checkout`; status `PENDING` so với `placed`. Cần chốt contract API và state machine; preview khi giá/tồn thay đổi phải reject hay yêu cầu preview lại. Không tự định nghĩa vòng đời thanh toán.
5. **Tiền tệ/ưu đãi:** voucher và VAT ở UI/backend khác nhau; cần chủ sở hữu nghiệp vụ xác nhận giá niêm yết đã gồm VAT chưa và chính sách voucher demo, sau đó chỉ backend tính giá authoritative. Không suy ra quy định thuế từ comment.
6. **Agent persistence:** làm rõ Agent có thể kết nối DB riêng cho checkpoint hay không; nguyên tắc hiện hành cấm Agent trực tiếp vào CSDL lõi. Xác định trusted identity, phạm vi tool và quyền guest/customer/admin.
7. **Refund/HITL:** chốt đưa vào use case hiện tại ở mức yêu cầu hỗ trợ mô phỏng hay loại khỏi baseline; mọi chuyển tiền thực vẫn ngoài phạm vi. Không tự mở rộng 3 persona hay quyền tự duyệt.
8. **Phiên bản stack:** AGENTS nêu NestJS 12+, Next.js 16+/React 19; package hiện khai NestJS 10, Next.js 14/React 18. Cần chọn phiên bản baseline hoặc kế hoạch nâng cấp có kiểm chứng tương thích.

## 7. Kiểm thử và bước kế tiếp

- Lượt đánh giá trước: frontend `npx tsc --noEmit --incremental false` thoát 0; backend Jest 0 test chạy do `EPERM` khi ghi cache temp (kể cả thử `--no-cache`); pytest Agent đã khởi chạy nhưng không hoàn tất và được dừng. Không suy ra chất lượng runtime từ các kết quả này.
- Trong lượt kiểm kê này: **chỉ đọc source/tài liệu, không chạy E2E, DB, LLM hoặc CI**. Git status được kiểm tra trước khi tạo báo cáo.
- CI `.github/workflows/ci.yml` trỏ `apps/backend`, `apps/agent`, `apps/frontend`, không khớp cây hiện tại. Chưa kiểm tra kết quả CI từ xa.
- Ưu tiên đề xuất: thống nhất các quyết định ảnh hưởng đến phân quyền/checkout; dựng kiểm thử HTTP với principal thật cho Agent và core; sửa bảo mật theo từng lát cắt; sau đó checkout PostgreSQL + idempotency/cancel concurrency; cuối cùng đánh giá RAG thật. Cần ghi test pass/fail/blocked theo bằng chứng.

