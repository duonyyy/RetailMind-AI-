import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CartService } from './cart.service';
import { AddToCartDTO, UpdateCartItemDTO } from './dto/cart.dto';

@Roles('CUSTOMER', 'ADMIN')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(
    @Query('storeId') storeId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.cartService.getCart(user.id, storeId);
    return {
      status: 'success',
      data,
    };
  }

  @Post('items')
  async addItem(
    @Body() dto: AddToCartDTO,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.cartService.addItem(user.id, dto);
    return {
      status: 'success',
      message: 'Đã thêm sản phẩm vào giỏ hàng thành công.',
      data,
    };
  }

  @Patch('items/:sku')
  async updateItemQuantity(
    @Param('sku') sku: string,
    @Body() dto: UpdateCartItemDTO,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.cartService.updateItemQuantity(user.id, sku, dto.quantity, dto.storeId);
    return {
      status: 'success',
      message: 'Đã cập nhật số lượng sản phẩm.',
      data,
    };
  }

  @Delete('items/:sku')
  async removeItem(
    @Param('sku') sku: string,
    @Query('storeId') storeId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.cartService.removeItem(user.id, sku, storeId);
    return {
      status: 'success',
      message: 'Đã xóa sản phẩm khỏi giỏ hàng.',
      data,
    };
  }

  @Delete()
  async clearCart(@CurrentUser() user: AuthenticatedUser) {
    await this.cartService.clearCart(user.id);
    return {
      status: 'success',
      message: 'Đã xóa toàn bộ giỏ hàng.',
    };
  }
}
