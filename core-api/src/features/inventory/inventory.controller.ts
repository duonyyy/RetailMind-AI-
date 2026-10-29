import { Roles } from '../../shared/decorators/roles.decorator';
import { Public } from '../../shared/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { InventoryService } from './services/inventory.service';

@Controller(['inventory', 'admin/inventory'])
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Public()
  @Get('stores')
  async getStores() {
    const stores = await this.inventoryService.getStores();
    return {
      status: 'success',
      total: stores.length,
      data: stores,
    };
  }

  @Public()
  @Get('stock')
  async getStock(
    @Query('storeId') storeId: string,
    @Query('variantId') variantId: string,
  ) {
    const stock = await this.inventoryService.getStock(storeId, variantId);
    return {
      status: 'success',
      data: stock,
    };
  }

  @Roles('ADMIN')
  @Post('reserve')
  async reserveStock(
    @Body('storeId') storeId: string,
    @Body('variantId') variantId: string,
    @Body('quantity') quantity: number,
  ) {
    await this.inventoryService.reserveStock(storeId, variantId, quantity);
    return {
      status: 'success',
      message: `Đã giữ chỗ thành công ${quantity} sản phẩm tại kho.`,
    };
  }

  @Roles('ADMIN')
  @Post('adjust')
  async adjustInventory(
    @Body('storeId') storeId: string,
    @Body('variantId') variantId: string,
    @Body('newOnHandQty') newOnHandQty: number,
    @Body('reason') reason: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const actorId = user ? `admin:${user.id}` : 'admin';
    const result = await this.inventoryService.adjustInventory(
      storeId,
      variantId,
      newOnHandQty,
      reason,
      actorId,
    );
    return {
      status: 'success',
      message: 'Điều chỉnh số lượng tồn kho thành công.',
      data: result,
    };
  }
}
