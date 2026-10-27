# Coding Standards & Clean Architecture Guidelines

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/09-guidelines/CODING_STANDARDS.md`  
**Căn cứ đặc tả**: `AGENTS.md` & `docs/architecture/01_system_architecture.md`  
**Trạng thái**: Approved for Architecture Baseline (Production 2026 Edition)  

---

## 1. Tiêu Chuẩn Viết Mã Nguồn Chung (General Principles)

1. **Tuân Thủ Phong Cách Ngôn Ngữ & Định Kiểu Tĩnh**:
   - **Backend**: Python 3.11+, PEP 8, Type Hints đầy đủ 100%, linter & formatter bằng `ruff` và kiểm tra kiểu bằng `mypy`.
   - **Frontend**: TypeScript 5+, React 18, ESLint, Prettier, chế độ nghiêm ngặt (`strict: true`, cấm dùng `any`).
2. **Quy Chuẩn Tiền Tệ & Định Lượng**:
   - Bắt buộc dùng kiểu dữ liệu `Decimal` trong Python và `NUMERIC(18, 0)` trong PostgreSQL cho toàn bộ giá bán và tiền tệ VNĐ.
   - **Nghiêm cấm tuyệt đối sử dụng kiểu `float`** để tránh các sai số làm tròn số học (ví dụ: $0.1 + 0.2 \ne 0.3$).
3. **Ngôn Ngữ Giao Tiếp & Đặt Tên**:
   - Tài liệu, báo cáo, giải thích kỹ thuật và docstring nghiệp vụ: **Tiếng Việt**.
   - Tên biến, tên hàm, tên class, endpoint API, bảng và cột CSDL: **Tiếng Anh chuẩn mực**.

---

## 2. Kiến Trúc Backend NestJS 12+: Thin Controllers & Rich Services

NestJS Controllers chỉ đóng vai trò là tầng điều phối giao thức HTTP. Tuyệt đối không viết trực tiếp logic tính toán tiền, khóa kho hoặc câu lệnh SQL phức tạp trong Controller:

```typescript
// ✅ CHUẨN MỰC: Controller mỏng chỉ điều phối HTTP, Guards & Dependency Injection
@Controller('api/v1/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('confirm')
  @Roles('CUSTOMER')
  @HttpCode(HttpStatus.CREATED)
  async confirmOrder(
    @Body() dto: OrderConfirmRequestDTO,
    @CurrentUser() user: UserDTO,
    @Headers('idempotency-key') idempotencyKey: string,
  ): Promise<APIEnvelope<OrderResponseDTO>> {
    // 1. Gọi Service thực thi nghiệp vụ trong Transaction ACID
    const order = await this.ordersService.confirmOrder(user.id, dto, idempotencyKey);
    
    // 2. Đóng gói kết quả theo chuẩn API Envelope
    return APIEnvelope.success(order);
  }
}
```

---

## 3. Quy Chuẩn Thực Thể CSDL TypeORM (NestJS 12+ & PostgreSQL 16+)

Toàn bộ Entities bắt buộc sử dụng TypeScript Decorators của TypeORM với định kiểu chặt chẽ và tiền tệ `NUMERIC(18, 0)`:

```typescript
// core-api/src/features/catalog/entities/variant.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('variants')
export class Variant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  sku: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'price_vnd', type: 'numeric', precision: 18, scale: 0 })
  priceVnd: string; // Lưu kiểu string để xử lý qua decimal.js, triệt tiêu sai số float

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Product, (product) => product.variants, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
```

---

## 4. Quy Chuẩn Công Cụ Tác Tử AI (Pydantic Typed Tools)

1. Mọi công cụ Agent gọi đều phải kế thừa `BaseModel` của Pydantic v2 để tự động xác thực tham số đầu vào.
2. Cung cấp `description` rõ ràng, có ví dụ cụ thể cho từng tham số để LLM hiểu đúng ngữ cảnh gọi tool.
3. Không bao giờ nhận `customer_id` hay `user_id` từ tham số của tool; lấy định danh trực tiếp từ context xác thực an toàn của hệ thống.
4. **Tính toán số học an toàn bằng cây cú pháp (AST Safe Calculator):** Tuyệt đối cấm dùng hàm `eval()` hay `exec()` để tính giá tiền, chiết khấu hoặc lãi suất trả góp. Bắt buộc sử dụng `ASTSafeCalculator` (`src.harness.tools.safe_calculator`) kết hợp toán tử an toàn và kiểu số `Decimal` chính xác.

---

## 5. Danh Mục 10 Lỗi Phản Khuôn Mẫu AI Agent Bị Nghiêm Cấm (10 AI Agent Anti-Patterns Checklist)

Nhằm đảm bảo tính công nghiệp và kỷ luật kỹ nghệ phần mềm cấp Enterprise, mọi thành viên và trợ lý AI tham gia phát triển dự án bắt buộc phải tuân thủ bảng kiểm soát 10 anti-patterns dưới đây:

### 1. Cấm Tuyệt Đối "Bare Except" & Nuốt Lỗi Âm Thầm
```python
# ❌ SAI: Nuốt lỗi bằng bare except, làm ẩn giấu lỗi hệ thống và crash ngầm
try:
    result = await llm.ainvoke(prompt)
except:
    pass

# ✅ ĐÚNG: Bắt ngoại lệ cụ thể, ghi log có cấu trúc và trả mã lỗi định danh
import logging
logger = logging.getLogger(__name__)

try:
    result = await llm.ainvoke(prompt)
except openai.RateLimitError as exc:
    logger.warning("LLM rate limit reached: %s. Kích hoạt fallback model.", exc)
    result = await fallback_llm.ainvoke(prompt)
except openai.APIError as exc:
    logger.error("LLM Provider API error: %s", exc, exc_info=True)
    raise AgentServiceUnavailableException("Dịch vụ AI tạm thời gián đoạn.")
```

### 2. Cấm Tuyệt Đối Hardcode Khóa Bí Mật & API Keys
```python
# ❌ SAI: Hardcode khóa bí mật trực tiếp trong mã nguồn
OPENAI_API_KEY = "sk-proj-abc123456789..."
DATABASE_URL = "postgresql://user:password123@localhost:5432/db"

# ✅ ĐÚNG: Sử dụng Pydantic BaseSettings & Environment Variables
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str
    database_url: str
    class Config:
        env_file = ".env"
```

### 3. Cấm Công Cụ Không Định Kiểu (Untyped Tools & Plain Dict)
```python
# ❌ SAI: Nhận tham số dưới dạng raw dict, không thể kiểm soát injection
def search_laptops(filter_params: dict):
    pass

# ✅ ĐÚNG: Bắt buộc dùng Pydantic v2 với Field validation và docstring rõ ràng
from pydantic import BaseModel, Field

class LaptopSearchInput(BaseModel):
    max_price_vnd: Decimal = Field(..., description="Ngân sách tối đa tính bằng VNĐ, ví dụ: 25000000")
    min_ram_gb: int = Field(default=8, ge=4, le=128, description="Dung lượng RAM tối thiểu (GB)")
    purpose: str = Field(default="general", description="Nhu cầu sử dụng: programming, gaming, design")
```

### 4. Cấm Hàm Khổng Lồ (> 50 Dòng) & God Files
* **Quy tắc:** Mỗi hàm chỉ thực thi **một trách nhiệm duy nhất (Single Responsibility Principle)** và có độ dài tối đa $\le 50$ dòng lệnh.
* Không dồn toàn bộ logic vào file `app.py` hay `agent.py`; bắt buộc phân tách thành các module chuyên biệt: `state.py`, `nodes.py`, `tools.py`, `schemas.py`.

### 5. Cấm Sử Dụng Kiểu Số Thực (Float) Cho Tiền Tệ
```python
# ❌ SAI: Dùng float gây sai lệch số học trong giao dịch thanh toán
price: float = 19990000.0
discount: float = 0.05
total = price * (1 - discount) # Gây sai lệch làm tròn cents

# ✅ ĐÚNG: Dùng Decimal trong Python và Numeric(18, 0) trong PostgreSQL
from decimal import Decimal
price = Decimal("19990000")
discount_multiplier = Decimal("0.95")
total_vnd = (price * discount_multiplier).quantize(Decimal("1"))
```

### 6. Cấm Vòng Lặp Suy Luận Vô Tận (Unbounded ReAct Loops)
* Mọi đồ thị LangGraph bắt buộc phải cấu hình `recursion_limit` và chốt chặn `MAX_STEPS = 5`.
* Khi chạm ngưỡng tối đa mà tác tử chưa giải quyết xong, bắt buộc kích hoạt Fallback node để thông báo minh bạch cho người dùng thay vì treo tiến trình.

### 7. Cấm LLM Trực Tiếp Ghi CSDL (Hallucinated Mutations)
* LLM tuyệt đối không có quyền chạy lệnh `INSERT/UPDATE/DELETE` trực tiếp vào PostgreSQL.
* Mọi thao tác mua hàng phải tuân thủ cơ chế 2 pha: LLM chỉ sinh `preview_token`, khách hàng ấn nút xác nhận thì Backend Service mới thực thi transaction.

### 8. Cấm Ghi Dữ Liệu Cá Nhân Nhạy Cảm (Raw PII) Vào Logs
* Số CCCD (12 chữ số), số điện thoại và email khách hàng phải được làm sạch bằng Regex Guardrail trước khi gửi cho LLM bên ngoài và trước khi đẩy vào OpenTelemetry/Phoenix traces.

### 9. Cấm Đánh Giá Cảm Tính Bằng Tay (Vibe-Checking)
* Không được chấp nhận tính năng nếu chỉ chat thử vài câu bằng tay mà không chạy qua **50 mẫu Golden Dataset** và kiểm thử hồi quy tự động.

### 10. Cấm Trừ Kho Không Có Khóa Bi Quan (Concurrency Oversell)
* Mọi thao tác kiểm tra và giữ kho đơn hàng bắt buộc phải dùng transaction CSDL với `SELECT ... FOR UPDATE` (Pessimistic Locking) để triệt tiêu 100% rủi ro Oversell khi có hàng trăm khách cùng bấm mua 1 sản phẩm cuối cùng.
