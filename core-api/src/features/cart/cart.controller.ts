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
import { AddToCartDTO, CartDTO, UpdateCartItemDTO } from './dto/cart.dto';

@Roles('CUSTOMER', 'ADMIN')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(
    @Query('storeId') storeId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartDTO> {
    return this.cartService.getCart(user.id, storeId);
  }

  @Post('items')
  async addItem(
    @Body() dto: AddToCartDTO,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartDTO> {
    return this.cartService.addItem(user.id, dto);
  }

  @Patch('items/:sku')
  async updateItemQuantity(
    @Param('sku') sku: string,
    @Body() dto: UpdateCartItemDTO,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartDTO> {
    return this.cartService.updateItemQuantity(user.id, sku, dto.quantity, dto.storeId);
  }

  @Delete('items/:sku')
  async removeItem(
    @Param('sku') sku: string,
    @Query('storeId') storeId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartDTO> {
    return this.cartService.removeItem(user.id, sku, storeId);
  }

  @Delete()
  async clearCart(@CurrentUser() user: AuthenticatedUser): Promise<{ message: string }> {
    await this.cartService.clearCart(user.id);
    return { message: 'Đã xóa toàn bộ giỏ hàng.' };
  }
}
