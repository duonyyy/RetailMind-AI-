import { CurrentUser, AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { OrdersService, CheckoutInputDTO, OrderItemInput } from './orders.service';

@Roles('CUSTOMER', 'ADMIN')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('preview')
  async preview(
    @Body('items') items: OrderItemInput[],
    @Body('discountCode') discountCode?: string,
    @Body('storeId') storeId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const calculation = await this.ordersService.calculatePreview(items, discountCode, storeId, user?.id);
    return {
      status: 'success',
      data: calculation,
    };
  }

  @Post('checkout')
  async checkout(
    @Body() dto: CheckoutInputDTO,
    @Headers('idempotency-key') idempotencyKey?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const key = idempotencyKey || (dto as any).idempotencyKey;
    if (!key) {
      throw new BadRequestException('Bắt buộc cung cấp Header "Idempotency-Key" để chốt đơn.');
    }
    const order = await this.ordersService.checkout({ ...dto, customerId: user?.id }, key);
    return {
      status: 'success',
      message: 'Đặt hàng thành công. Đã giữ chỗ tồn kho tại siêu thị.',
      data: order,
    };
  }

  @Get()
  async getOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.ordersService.getOrders(user, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
    });
    return {
      status: 'success',
      ...result,
    };
  }

  @Get(':id')
  async getOrder(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const order = await this.ordersService.getOrder(id, user);
    return {
      status: 'success',
      data: order,
    };
  }

  @Post(':id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.ordersService.cancelOrder(id, reason, user);
    return {
      status: 'success',
      message: result.message,
      data: result,
    };
  }

  @Post(':id/simulate-payment')
  async simulatePayment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.ordersService.simulatePayment(id, user);
    return {
      status: 'success',
      message: 'Thanh toán mô phỏng thành công.',
      data: result,
    };
  }
}
