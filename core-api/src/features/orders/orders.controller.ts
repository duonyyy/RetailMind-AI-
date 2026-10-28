import { CurrentUser, AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Param,
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
  ) {
    const calculation = await this.ordersService.calculatePreview(items, discountCode);
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
    const order = await this.ordersService.checkout({ ...dto, customerId: user.id }, key);
    return {
      status: 'success',
      message: 'Đặt hàng thành công. Đã giữ chỗ tồn kho tại siêu thị.',
      data: order,
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
}
