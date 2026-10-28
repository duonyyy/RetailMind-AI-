import { Public } from '../../shared/decorators/public.decorator';
import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InternalAgentService } from './internal-agent.service';
import { InternalSecretGuard } from '../../shared/guards/internal-secret.guard';

@Public()
@Controller('internal/tools')
@UseGuards(InternalSecretGuard)
export class InternalAgentController {
  constructor(private readonly agentService: InternalAgentService) {}

  private commerceUnavailable(): never {
    throw new ServiceUnavailableException('Thao tác chưa có nguồn dữ liệu và xác nhận nghiệp vụ đáng tin cậy.');
  }

  // 1. Tìm kiếm laptop
  @Post(['catalog-search', 'search_products'])
  async catalogSearch(@Body() body: any) {
    const res = await this.agentService.searchCatalog(body || {});
    return { status: 'success', tool: 'catalog_search', data: res };
  }

  // 2. Chi tiết sản phẩm
  @Post(['product-detail', 'get_product_details'])
  async productDetail(@Body() body: any) {
    const res = await this.agentService.getProductDetails(body || {});
    return { status: 'success', tool: 'get_product_details', data: res };
  }

  // 3. So sánh sản phẩm
  @Post(['compare-products', 'compare_products'])
  async compareProducts(@Body() body: any) {
    const res = await this.agentService.compareProducts(body || {});
    return { status: 'success', tool: 'compare_products', data: res };
  }

  // 4. Kiểm tra tồn kho
  @Post(['inventory-check', 'check_inventory'])
  async inventoryCheck(@Body() body: any) {
    this.commerceUnavailable();
    const res = await this.agentService.checkInventory(body || {});
    return { status: 'success', tool: 'inventory_check', data: res };
  }

  // 5. Tra cứu chính sách bảo hành / đổi trả
  @Post(['policy-search', 'search_policy'])
  async policySearch(@Body() body: any) {
    const res = await this.agentService.searchPolicy(body || {});
    return { status: 'success', tool: 'search_policy', data: res };
  }

  // 6. Xem giỏ hàng (Chống IDOR qua Header X-Customer-Id)
  @Post(['cart-view', 'view_cart'])
  async cartView(
    @Headers('x-customer-id') customerIdHeader?: string,
    @Body('customer_id') customerIdBody?: string,
  ) {
    this.commerceUnavailable();
    const customerId = customerIdHeader || customerIdBody || 'usr-customer-01';
    const res = await this.agentService.viewCart(customerId);
    return { status: 'success', tool: 'view_cart', data: res };
  }

  // 7. Thêm vào giỏ hàng
  @Post(['cart-add', 'add_to_cart'])
  async cartAdd(
    @Body() body: any,
    @Headers('x-customer-id') customerIdHeader?: string,
  ) {
    this.commerceUnavailable();
    const customerId = customerIdHeader || body.customer_id || 'usr-customer-01';
    const res = await this.agentService.addToCart(customerId, body || {});
    return { status: 'success', tool: 'add_to_cart', data: res };
  }

  // 8. Xóa khỏi giỏ hàng
  @Post(['cart-remove', 'remove_from_cart'])
  async cartRemove(
    @Body() body: any,
    @Headers('x-customer-id') customerIdHeader?: string,
  ) {
    this.commerceUnavailable();
    const customerId = customerIdHeader || body.customer_id || 'usr-customer-01';
    const res = await this.agentService.removeFromCart(customerId, body || {});
    return { status: 'success', tool: 'remove_from_cart', data: res };
  }

  // 9. Xem trước đơn hàng & Signed Preview Token
  @Post(['order-preview', 'preview_order'])
  async orderPreview(@Body() body: any) {
    this.commerceUnavailable();
    const res = await this.agentService.previewOrder(body || {});
    return { status: 'success', tool: 'order_preview', data: res };
  }

  // 10. Trạng thái đơn hàng
  @Post(['order-status', 'get_order_status'])
  async orderStatus(@Body() body: any) {
    this.commerceUnavailable();
    const res = await this.agentService.getOrderStatus(body || {});
    return { status: 'success', tool: 'get_order_status', data: res };
  }

  // 11. Hủy đơn hàng giả lập
  @Post(['order-cancel', 'cancel_simulated_order'])
  async orderCancel(@Body() body: any) {
    this.commerceUnavailable();
    const res = await this.agentService.cancelOrder(body || {});
    return { status: 'success', tool: 'cancel_simulated_order', data: res };
  }

  // 12. Tạo phiếu hỗ trợ CSKH
  @Post(['ticket-create', 'create_support_ticket'])
  async ticketCreate(
    @Body() body: any,
    @Headers('x-customer-id') customerIdHeader?: string,
  ) {
    this.commerceUnavailable();
    const customerId = customerIdHeader || body.customer_id || 'usr-customer-01';
    const res = await this.agentService.createSupportTicket(customerId, body || {});
    return { status: 'success', tool: 'create_support_ticket', data: res };
  }

  // 13. Tính phạt vi phạm hợp đồng kinh tế (Điều 301 Luật Thương Mại)
  @Post(['penalty-calculate', 'calculate_penalty'])
  async penaltyCalculate(@Body() body: any) {
    const res = await this.agentService.calculateContractPenalty(body || {});
    return { status: 'success', tool: 'penalty_calculate', data: res };
  }

  // 14. Quản lý sản phẩm yêu thích (Favorites)
  @Post(['manage-favorite', 'manage_favorite'])
  async manageFavorite(
    @Body() body: any,
    @Headers('x-customer-id') customerIdHeader?: string,
  ) {
    const customerId = customerIdHeader || body.customer_id || 'usr-customer-01';
    const res = await this.agentService.manageFavorite(customerId, body || {});
    return { status: 'success', tool: 'manage_favorite', data: res };
  }
}
