import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CatalogService } from '../catalog/public-api';
import { InventoryService } from '../inventory/public-api';
import { AddToCartDTO, CartDTO, CartItemDTO } from './dto/cart.dto';
import { transactionalIdempotency } from '../../shared/idempotency/transactional-idempotency';

@Injectable()
export class CartService {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly inventoryService: InventoryService,
    @Optional()
    @InjectRepository(Cart)
    private readonly cartRepo?: Repository<Cart>,
    @Optional()
    @InjectRepository(CartItem)
    private readonly cartItemRepo?: Repository<CartItem>,
    @Optional()
    private readonly dataSource?: DataSource,
  ) {}

  private db(): DataSource {
    if (!this.dataSource?.isInitialized) {
      throw new ServiceUnavailableException('Dịch vụ giỏ hàng hiện không khả dụng.');
    }
    return this.dataSource;
  }

  private getCartRepo(): Repository<Cart> {
    if (this.cartRepo) return this.cartRepo;
    return this.db().getRepository(Cart);
  }

  private getCartItemRepo(): Repository<CartItem> {
    if (this.cartItemRepo) return this.cartItemRepo;
    return this.db().getRepository(CartItem);
  }

  async getOrCreateActiveCart(customerId: string, manager?: EntityManager): Promise<Cart> {
    if (!customerId || !customerId.trim()) {
      throw new BadRequestException('Mã khách hàng là bắt buộc để quản lý giỏ hàng.');
    }
    const cartRepo = manager ? manager.getRepository(Cart) : this.getCartRepo();
    let cart = await cartRepo.findOne({
      where: { customerId: customerId.trim(), status: 'active' },
      relations: ['items', 'items.variant'],
    });

    if (!cart) {
      cart = cartRepo.create({
        customerId: customerId.trim(),
        status: 'active',
        items: [],
      });
      cart = await cartRepo.save(cart);
      cart.items = [];
    }
    return cart;
  }

  async getCart(customerId: string, storeId?: string, manager?: EntityManager): Promise<CartDTO> {
    const cart = await this.getOrCreateActiveCart(customerId, manager);
    return this.mapCartToDto(cart, storeId, manager);
  }

  async addItem(customerId: string, dto: AddToCartDTO, manager?: EntityManager): Promise<CartDTO> {
    if (!dto?.sku || !dto.sku.trim()) {
      throw new BadRequestException('Mã SKU sản phẩm không được để trống.');
    }
    const quantity = dto.quantity ?? 1;
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Số lượng sản phẩm phải là số nguyên dương lớn hơn 0.');
    }

    const cart = await this.getOrCreateActiveCart(customerId, manager);
    const targetStoreId = dto.storeId?.trim() || '10000000-0000-0000-0000-000000000001';
    const currentManager = manager || this.db().manager;
    const store = await this.inventoryService.resolveStore(currentManager, targetStoreId);
    const variant = await this.inventoryService.resolveVariant(currentManager, dto.sku.trim());

    // Check live stock availability
    const stock = await this.inventoryService.getStock(store.id, variant.id, manager);
    if (stock.availableQty <= 0) {
      throw new ConflictException(`Sản phẩm "${variant.name}" hiện đã hết hàng khả dụng tại siêu thị.`);
    }

    const cartItemRepo = manager ? manager.getRepository(CartItem) : this.getCartItemRepo();
    const existingItem = (cart.items || []).find((i) => i.variantId === variant.id);

    const newQuantity = (existingItem?.quantity || 0) + quantity;
    if (newQuantity > stock.availableQty) {
      throw new ConflictException(
        `Không thể thêm ${quantity} sản phẩm. Tổng số lượng yêu cầu (${newQuantity}) vượt quá tồn kho khả dụng hiện có (${stock.availableQty}).`,
      );
    }

    if (existingItem) {
      existingItem.quantity = newQuantity;
      await cartItemRepo.save(existingItem);
    } else {
      const newItem = cartItemRepo.create({
        cartId: cart.id,
        variantId: variant.id,
        quantity,
      });
      await cartItemRepo.save(newItem);
    }

    return this.getCart(customerId, store.id, manager);
  }

  async addItemIdempotent(customerId: string, dto: AddToCartDTO, key: string): Promise<CartDTO> {
    return this.db().transaction('SERIALIZABLE', manager =>
      transactionalIdempotency(manager, customerId, 'add_to_cart', key,
        { sku: dto.sku, quantity: dto.quantity, storeId: dto.storeId ?? null }, async () => {
          await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`cart:${customerId}`]);
          return this.addItem(customerId, dto, manager);
        }));
  }

  async updateItemQuantity(
    customerId: string,
    sku: string,
    quantity: number,
    storeId?: string,
  ): Promise<CartDTO> {
    if (!sku || !sku.trim()) {
      throw new BadRequestException('Mã SKU không được để trống.');
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Số lượng sản phẩm phải là số nguyên dương lớn hơn 0.');
    }

    const cart = await this.getOrCreateActiveCart(customerId);
    const variant = await this.inventoryService.resolveVariant(this.db().manager, sku.trim());

    const existingItem = (cart.items || []).find((i) => i.variantId === variant.id);
    if (!existingItem) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với SKU "${sku}" trong giỏ hàng.`);
    }

    const targetStoreId = storeId?.trim() || '10000000-0000-0000-0000-000000000001';
    const store = await this.inventoryService.resolveStore(this.db().manager, targetStoreId);
    const stock = await this.inventoryService.getStock(store.id, variant.id);

    if (quantity > stock.availableQty) {
      throw new ConflictException(
        `Số lượng yêu cầu (${quantity}) vượt quá tồn kho khả dụng hiện có (${stock.availableQty}).`,
      );
    }

    existingItem.quantity = quantity;
    await this.getCartItemRepo().save(existingItem);

    return this.getCart(customerId, store.id);
  }

  async removeItem(customerId: string, sku: string, storeId?: string, manager?: EntityManager): Promise<CartDTO> {
    if (!sku || !sku.trim()) {
      throw new BadRequestException('Mã SKU không được để trống.');
    }

    const cart = await this.getOrCreateActiveCart(customerId, manager);
    const variant = await this.inventoryService.resolveVariant(manager || this.db().manager, sku.trim());

    const existingItem = (cart.items || []).find((i) => i.variantId === variant.id);
    if (!existingItem) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với SKU "${sku}" trong giỏ hàng.`);
    }

    await (manager ? manager.getRepository(CartItem) : this.getCartItemRepo()).delete(existingItem.id);
    return this.getCart(customerId, storeId, manager);
  }

  async removeItemIdempotent(customerId: string, sku: string, storeId: string | undefined, key: string): Promise<CartDTO> {
    return this.db().transaction('SERIALIZABLE', manager =>
      transactionalIdempotency(manager, customerId, 'remove_from_cart', key, { sku, storeId: storeId ?? null }, async () => {
        await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`cart:${customerId}`]);
        return this.removeItem(customerId, sku, storeId, manager);
      }));
  }

  async clearCart(customerId: string): Promise<void> {
    const cart = await this.getOrCreateActiveCart(customerId);
    if (cart.items?.length) {
      await this.getCartItemRepo().delete({ cartId: cart.id });
    }
  }

  private async mapCartToDto(cart: Cart, storeId?: string, manager?: EntityManager): Promise<CartDTO> {
    const items = cart.items || [];
    let subtotal = new Decimal(0);
    const mappedItems: CartItemDTO[] = [];

    const targetStoreId = storeId?.trim() || '10000000-0000-0000-0000-000000000001';

    for (const item of items) {
      let variantName = item.variant?.name;
      let variantSku = item.variant?.sku;
      let unitPriceStr = item.variant?.price_vnd?.toString();

      if (!variantSku || !unitPriceStr) {
        const resolved = await this.inventoryService.resolveVariant(manager || this.db().manager, item.variantId);
        variantName = resolved.name;
        variantSku = resolved.sku;
        unitPriceStr = resolved.price_vnd;
      }

      const unitPrice = new Decimal(unitPriceStr);
      const lineTotal = unitPrice.times(item.quantity);
      subtotal = subtotal.plus(lineTotal);

      let availableStock = 0;
      try {
        const stock = await this.inventoryService.getStock(targetStoreId, item.variantId, manager);
        availableStock = stock.availableQty;
      } catch {
        availableStock = 0;
      }

      mappedItems.push({
        id: item.id,
        sku: variantSku,
        name: variantName,
        variantId: item.variantId,
        unitPriceVnd: unitPrice.toString(),
        formattedUnitPrice: `${new Intl.NumberFormat('vi-VN').format(BigInt(unitPrice.toFixed(0)))} ₫`,
        quantity: item.quantity,
        lineTotalVnd: lineTotal.toString(),
        formattedLineTotal: `${new Intl.NumberFormat('vi-VN').format(BigInt(lineTotal.toFixed(0)))} ₫`,
        availableStock,
        inStock: availableStock >= item.quantity,
      });
    }

    const vat = subtotal.times(0.10).floor();
    const total = subtotal.plus(vat);

    return {
      id: cart.id,
      customerId: cart.customerId,
      status: cart.status,
      items: mappedItems,
      itemsCount: mappedItems.reduce((acc, it) => acc + it.quantity, 0),
      subtotalVnd: subtotal.toString(),
      vatVnd: vat.toString(),
      totalVnd: total.toString(),
      formattedTotal: `${new Intl.NumberFormat('vi-VN').format(BigInt(total.toFixed(0)))} ₫`,
      updatedAt: (cart.updatedAt || new Date()).toISOString(),
    };
  }
}

