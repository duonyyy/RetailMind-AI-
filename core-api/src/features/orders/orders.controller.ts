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
  ) {
    const key = idempotencyKey || (dto as any).idempotencyKey;
    if (!key) {
      throw new BadRequestException('Bắt buộc cung cấp Header "Idempotency-Key" để chốt đơn.');
    }
    const order = await this.ordersService.checkout(dto, key);
    return {
      status: 'success',
      message: 'Đặt hàng thành công. Đã giữ chỗ tồn kho tại siêu thị.',
      data: order,
    };
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    const order = await this.ordersService.getOrder(id);
    return {
      status: 'success',
      data: order,
    };
  }
}
