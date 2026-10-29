# Rà soát hiện trạng và backlog RetailMind AI — 29/10/2026

## Phạm vi và bằng chứng

Đối chiếu cấu trúc repository, 12 use case, cấu hình, các entrypoint và những luồng chính của NestJS, Next.js, Agent, RAG, cơ sở dữ liệu và Docker. Đây là rà soát theo luồng và rủi ro, chưa phải đọc từng dòng của toàn bộ repository hay kiểm định bảo mật đầy đủ. Mã hiện tại là căn cứ chính; README/PLANS có nội dung cũ và không thống nhất về phase. Không suy ra trạng thái triển khai từ tên class, tài liệu hoặc test mock.

Snapshot Git: `8ac2a58`; có ba thay đổi chưa commit trong support và một thư mục `agent-system/Giao_Trinh/` chưa được Git theo dõi, được giữ nguyên. Các đánh giá sau bao gồm thay đổi chưa commit. Docker daemon báo `Access is denied` trong phiên rà soát này: chưa kiểm tra runtime container, PostgreSQL, Qdrant, MinIO hay provider thực ở thời điểm hiện tại.

## Những điểm cần xử lý ngay

1. **P0 — Chuẩn hóa checkout và dữ liệu nguồn.** `core-api/src/features/orders/orders.service.ts` còn fallback in-memory nếu không có datasource; `catalog.service.ts` có catalog/giá mặc định khi truy vấn lỗi hoặc không có dữ liệu. `inventory.service.ts` quy mã store/variant không biết về UUID seed đầu tiên. Điều này có thể tạo giao dịch với dữ liệu không đáng tin hoặc giữ tồn sai SKU/store. Phải bỏ fallback nghiệp vụ, tra mã thật từ PostgreSQL và trả lỗi khi thiếu dữ liệu; tách fixture/test ra khỏi runtime.
2. **P0 — Biên nhận và thanh toán mô phỏng phải trung thực.** `web-client/src/app/checkout/success/page.tsx` lấy đơn/giá/`paid=true` từ URL và có dữ liệu mặc định nhưng hiển thị thành công, đã đối soát Napas. `SimulatedQRPaymentModal.tsx` dùng timer. Trạng thái URL không chứng minh thanh toán hay đặt hàng. Truy vấn đơn theo principal từ backend, loại thông báo đối soát thật; nếu cần thanh toán mô phỏng phải có trạng thái mô phỏng do backend quản lý.
3. **P0 — Idempotency, preview và đồng thời.** Checkout chỉ kiểm tra `previewToken` nếu được gửi, sau khi xác minh chỉ đối chiếu store; chưa đối chiếu customer, items, số lượng và giá với payload đã ký. Cache idempotency trong RAM và kiểm tra DB trước insert chưa chứng minh an toàn nhiều process/tranh chấp; đối chiếu body và xác định kết quả xử lý trùng. Phải kiểm thử PostgreSQL thật cho yêu cầu cùng key khác payload, cùng key song song và tranh mua chiếc cuối. Không khẳng định hiện đã oversell nếu chưa chạy test.
4. **P0 — Sửa danh tính và tra cứu đơn.** Checkout tạo `orderId` dạng `ord-<time>` trước khi lưu trong khi ID DB do `savedOrder.id` tạo; `getOrder` chỉ đọc `ordersStore` trong process. Việc nhận lại đơn sau restart và liên thông support qua ID cần đối chiếu DB thật; map customer `usr-` sang UUID seed cũng không phù hợp principal thực. Trả ID DB chính thức và truy vấn theo owner; test sau restart và hai khách.
5. **P0 — Internal favorite và principal đáng tin.** `internal-agent.controller.ts` còn route `manage-favorite` nhận customer ID từ header/body hoặc mặc định, khác các route commerce đang trả 503; service luôn toggle dù action là add/remove và có nhánh báo success khi thiếu service. Internal secret xác thực service, không tự chứng minh danh tính khách. Cần fail closed cho đến khi có principal được xác thực đầu-cuối, kiểm tra owner và hành vi add/remove đúng; kiểm thử giả header, guest và customer khác.
6. **P0 — Trạng thái đơn và hủy trên web.** `web-client/src/app/orders/page.tsx` có đơn hard-code, nút hủy chỉ sửa state React. Cần nối API DB có kiểm tra ownership và transaction; chỉ hiển thị thành công khi backend xác nhận. Hủy chưa có route public trong `orders.controller.ts`; cần thiết kế rõ lifecycle trước khi mở.

## Ma trận 12 use case

Trạng thái bên dưới là đánh giá source theo phạm vi đã đọc, không phải chứng nhận hoàn thành E2E.

| UC | Hiện trạng | Việc còn lại |
|---|---|---|
| UC01 Auth | Có register/login/refresh/logout/me, guards và frontend | Kiểm thử runtime token hết hạn, rotation/replay, logout, role và hai khách trên cả BFF/API. |
| UC02 Catalog | Có endpoints và trang duyệt | Loại dữ liệu giá mặc định khỏi đường nghiệp vụ, chứng minh tìm/lọc/so sánh đúng DB. |
| UC03 Agent tư vấn | Có LangGraph, tools, SSE và provider adapters; cấu hình dev là scripted | Test luồng thực với provider đã chọn, dữ liệu catalog tin cậy, quyền và tool errors; scripted không phải live model. |
| UC04 Tồn kho | Có service và khóa giao dịch ở một số luồng | Loại mã mặc định, xác minh số liệu đọc từ DB; internal Agent inventory đang chủ động trả 503. |
| UC05 Chính sách RAG | Có retrieval/ingestion scaffolding | Chặn nội dung mặc định chưa có nguồn, nối phiên bản published, chunk và Qdrant thật; sửa evidence/grounding. |
| UC06 Chat và favorites | Có principal/owner cho thread và API favorites | Xác minh persistence và cách xử lý khi Redis/DB mất; sửa route internal favorite như P0. |
| UC07 Giỏ hàng | Có màn hình và code tool; routes internal cart trả 503 | Xây API giỏ theo owner và DB thật, làm rõ hợp đồng đồng bộ UI/Agent; test hai người dùng. |
| UC08 Preview/checkout | Có transaction, order items, khóa kho, preview token và web | Các P0 checkout ở trên, xác minh transaction/idempotency/rollback với DB thật. |
| UC09 Theo dõi/hủy đơn | Có service hủy và UI | UI hiện state giả; cần API DB, owner, lifecycle, hoàn tồn và test concurrency/restart. |
| UC10 Ticket | Có form xác nhận số hồ sơ và service kiểm tra owner đơn trong transaction | Kiểm thử lại login thật/browser và failure/đồng thời; Agent ticket gateway vẫn 503, biên nhận chưa tự quay về chat. |
| UC11 Admin catalog/kho | Có màn hình và một số endpoint | Đối chiếu từng thao tác CRUD/kho với API, RBAC, DB và audit log; không suy ra đầy đủ từ UI. |
| UC12 Quản trị tri thức/ticket/eval | Có upload/queue và các module eval | Worker hiện mô phỏng Qdrant upsert; xác minh publish/version/checksum và xử lý ticket/admin thật. |

Danh mục UC: `enterprise-docs/docs/01-requirements/04-USE_CASES.md`.

## P1 — Chất lượng Agent, dữ liệu và bảo mật

7. **Evidence/citation/grounding:** `critic.py` gán sẵn 0.50/0.90/0.85 theo việc có evidence và độ dài; `finalize.py` nối tên nguồn mà không chứng minh từng khẳng định. Cần contract evidence có nguồn/version/chunk/span, đối chiếu claim với nội dung, trạng thái không đủ nguồn và kết quả không dùng điểm giả. Bộ kiểm thử gồm nguồn không liên quan, nguồn cũ, claim trái nguồn và không có nguồn; benchmark chất lượng độc lập.
8. **Knowledge và ingestion:** `knowledge.service.ts` có chính sách mặc định, khi không match có thể trả danh sách default; `ingestion.processor.ts` trả completed dù Qdrant upsert chỉ simulated. Cần phân biệt queued/processing/indexed/published/failed trên dữ liệu bền vững; xác minh checksum, chống ghi đè phiên bản, chỉ truy xuất published; lỗi storage/index trả lỗi chứ không báo indexed.
9. **PII và form ticket:** đã có masking ở các provider path và chặn placeholder cho tool theo source; không xem đó là bằng chứng mọi biến thể PII đều được che. Kiểm thử end-to-end với log, tool output, exception, embedding/reranker và provider thật có kiểm soát. Không lập bảng ánh xạ placeholder tùy ý. Form ticket dùng số trong hồ sơ, không cần gửi số cho model; kiểm tra dữ liệu mô tả ticket cũng có thể chứa PII.
10. **HITL và persistence:** routes có role admin và có ràng buộc owner thread; `resolve_and_resume_hitl` đang chặn thực thi approval đến khi xác minh requester ownership. Thiết kế lưu principal gốc, thời hạn, chống replay/duplicate, audit; kiểm thử hai route family với guest/customer/admin, token và reviewer giả. Kiểm tra rủi ro memory fallback khi mất Redis/checkpointer, nhất là restart hoặc nhiều replicas.
11. **Tài liệu và quyết định:** đồng bộ README/PLANS với source và trạng thái thực, ghi rõ Next 14/React 18/Nest 10 trong package so với kỳ vọng phiên bản trong AGENTS; quyết định nâng version hay sửa baseline sau khi xem compatibility. Làm rõ scope của module tính phạt hợp đồng và các chính sách tài chính mẫu so với 12 UC/3 persona; không tự mở rộng nghiệp vụ.

## Thứ tự thực hiện đề xuất

- **Đợt 1:** Chặn thông báo thành công giả và internal favorite không có principal; loại ID mapping mặc định và fallback giao dịch. Exit: test lỗi DB, mã không tồn tại, giả danh, trực tiếp trang success.
- **Đợt 2:** Checkout theo PostgreSQL: định danh/giá thật, DTO, token ràng buộc owner/items, idempotency theo payload, transaction và trả ID DB; test race/rollback/restart và hai khách.
- **Đợt 3:** Nối giỏ, lịch sử/hủy đơn và ticket trên UI/API thật; test owner, trả lỗi và tạo/hủy thực tế với fixture cô lập.
- **Đợt 4:** Ingestion/version/RAG và evidence/citation; test phiên bản công bố và nguồn sai.
- **Đợt 5:** HITL, privacy và kiểm thử provider thật; kiểm thử lại sau khi quyền và nghiệp vụ đã ổn định.
- **Đợt 6:** Smoke/E2E toàn stack, vận hành và cập nhật tài liệu theo bằng chứng; không coi test mock hoặc chỉ build Docker là bằng chứng production-ready.

## Kiểm tra của phiên này

- TypeScript `tsc --noEmit --incremental false`: core-api **PASS**, web-client **PASS**.
- Agent pytest lần đầu: 3 lỗi setup `tmp_path` do Windows từ chối thư mục Temp; không xem đây là lỗi logic sản phẩm. Lần chạy lại dùng temp trong workspace vẫn bị từ chối truy cập và pytest thoát lỗi trong bước dọn fixture; toàn bộ suite chưa PASS trong phiên này.
- Docker/container và live provider: **BLOCKED/NOT RUN** trong phiên do daemon từ chối truy cập; không suy ra Docker đang tắt.
- Chưa chạy backend Jest, browser E2E, DB concurrency, live-provider eval hoặc xác minh coverage từng file. Kết quả các phiên trước không thay thế xác nhận phiên này.
