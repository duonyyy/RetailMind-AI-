import {
  Injectable,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Inventory } from '../entities/inventory.entity';

export interface StoreDTO {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
}

export interface StockDTO {
  storeId: string;
  storeName: string;
  variantId: string;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  isAvailable: boolean;
}

export interface ReserveItemInput {
  variantId: string;
  quantity: number;
}

@Injectable()
export class InventoryService {
  private readonly defaultStores: StoreDTO[] = [
    {
      id: 'store-hcm-q1',
      code: 'MWG_HCM_001',
      name: 'Thế Giới Di Động 136 Nguyễn Thái Học, Quận 1, TP.HCM',
      address: '136 Nguyễn Thái Học, P. Phạm Ngũ Lão, Quận 1, TP. Hồ Chí Minh',
      phone: '1800 1060',
    },
    {
      id: 'store-hn-cg',
      code: 'MWG_HN_002',
      name: 'Thế Giới Di Động 117 Thái Hà, Đống Đa, Hà Nội',
      address: '117 Thái Hà, P. Trung Liệt, Q. Đống Đa, TP. Hà Nội',
      phone: '1800 1060',
    },
    {
      id: 'store-dn-hc',
      code: 'MWG_DN_003',
      name: 'Điện Máy Xanh 320 đường 2 Tháng 9, Hải Châu, Đà Nẵng',
      address: '320 đường 2 Tháng 9, P. Hòa Cường Bắc, Q. Hải Châu, TP. Đà Nẵng',
      phone: '1800 1061',
    },
  ];

  // In-memory inventory state: key = `${storeId}:${variantId}` -> { onHand: number, reserved: number }
  private readonly memoryInventory: Map<string, { onHand: number; reserved: number }> = new Map([
    // Asus Vivobook
    ['store-hcm-q1:var-asus-vivobook-15', { onHand: 12, reserved: 2 }],
    ['store-hcm-q1:LT-ASUS-VIVO15-OLED', { onHand: 12, reserved: 2 }],
    ['store-hn-cg:var-asus-vivobook-15', { onHand: 8, reserved: 1 }],
    ['store-hn-cg:LT-ASUS-VIVO15-OLED', { onHand: 8, reserved: 1 }],
    ['store-dn-hc:var-asus-vivobook-15', { onHand: 5, reserved: 0 }],
    ['store-dn-hc:LT-ASUS-VIVO15-OLED', { onHand: 5, reserved: 0 }],
    // Dell Inspiron
    ['store-hcm-q1:var-dell-inspiron-14', { onHand: 10, reserved: 1 }],
    ['store-hcm-q1:LT-DELL-INSP14-5430', { onHand: 10, reserved: 1 }],
    ['store-hn-cg:var-dell-inspiron-14', { onHand: 15, reserved: 3 }],
    ['store-hn-cg:LT-DELL-INSP14-5430', { onHand: 15, reserved: 3 }],
    ['store-dn-hc:var-dell-inspiron-14', { onHand: 6, reserved: 0 }],
    ['store-dn-hc:LT-DELL-INSP14-5430', { onHand: 6, reserved: 0 }],
    // Lenovo ThinkBook
    ['store-hcm-q1:var-lenovo-thinkbook-14', { onHand: 7, reserved: 1 }],
    ['store-hcm-q1:LT-LENOVO-TB14-G6', { onHand: 7, reserved: 1 }],
    ['store-hn-cg:var-lenovo-thinkbook-14', { onHand: 9, reserved: 2 }],
    ['store-hn-cg:LT-LENOVO-TB14-G6', { onHand: 9, reserved: 2 }],
    ['store-dn-hc:var-lenovo-thinkbook-14', { onHand: 4, reserved: 0 }],
    ['store-dn-hc:LT-LENOVO-TB14-G6', { onHand: 4, reserved: 0 }],
  ]);

  constructor(@Optional() private readonly dataSource?: DataSource) {}

  async getStores(): Promise<StoreDTO[]> {
    return this.defaultStores;
  }

  async getStock(storeId: string, variantId: string): Promise<StockDTO> {
    const store = this.defaultStores.find(s => s.id === storeId || s.code === storeId) || this.defaultStores[0];
    const key = `${store.id}:${variantId}`;
    const inv = this.memoryInventory.get(key) || { onHand: 8, reserved: 1 };
    const available = inv.onHand - inv.reserved;

    return {
      storeId: store.id,
      storeName: store.name,
      variantId,
      onHandQty: inv.onHand,
      reservedQty: inv.reserved,
      availableQty: Math.max(0, available),
      isAvailable: available > 0,
    };
  }

  /**
   * Khóa bi quan chống bán vượt tồn cho đơn hàng nhiều món (Anti-Oversell & Anti-Deadlock):
   * Sắp xếp variantId tăng dần trước khi khóa SELECT ... FOR UPDATE để triệt tiêu bế tắc (Deadlock).
   */
  async reserveMultipleWithLock(
    queryRunner: QueryRunner,
    storeId: string,
    items: ReserveItemInput[],
  ): Promise<void> {
    if (!items || items.length === 0) return;

    // QUY TẮC BẮT BUỘC (03-TRANSACTION_AND_CONCURRENCY.md): Sắp xếp tăng dần theo variantId
    const sortedItems = [...items].sort((a, b) => a.variantId.localeCompare(b.variantId));

    for (const item of sortedItems) {
      const inventory = await queryRunner.manager
        .createQueryBuilder(Inventory, 'inv')
        .setLock('pessimistic_write')
        .where('inv.store_id = :storeId AND inv.variant_id = :variantId', {
          storeId,
          variantId: item.variantId,
        })
        .getOne();

      if (!inventory) {
        throw new BadRequestException(
          `Không tìm thấy dữ liệu tồn kho cho sản phẩm ${item.variantId} tại chi nhánh ${storeId}.`,
        );
      }

      const availableQty = inventory.on_hand_qty - inventory.reserved_qty;
      if (availableQty < item.quantity) {
        throw new ConflictException(
          `Sản phẩm ${item.variantId} chỉ còn khả dụng ${availableQty} chiếc, không đủ đáp ứng số lượng đặt mua (${item.quantity}).`,
        );
      }

      inventory.reserved_qty += item.quantity;
      await queryRunner.manager.save(inventory);
    }
  }

  /**
   * Hoàn lại số lượng tồn kho trong Transaction khi đơn hàng bị hủy
   */
  async restoreStockInTx(
    queryRunner: QueryRunner,
    storeId: string,
    items: ReserveItemInput[],
  ): Promise<void> {
    if (!items || items.length === 0) return;

    const sortedItems = [...items].sort((a, b) => a.variantId.localeCompare(b.variantId));

    for (const item of sortedItems) {
      const inventory = await queryRunner.manager
        .createQueryBuilder(Inventory, 'inv')
        .setLock('pessimistic_write')
        .where('inv.store_id = :storeId AND inv.variant_id = :variantId', {
          storeId,
          variantId: item.variantId,
        })
        .getOne();

      if (inventory) {
        inventory.reserved_qty = Math.max(0, inventory.reserved_qty - item.quantity);
        await queryRunner.manager.save(inventory);
      }
    }
  }

  async reserveStock(storeId: string, variantId: string, quantity: number): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        await this.reserveMultipleWithLock(queryRunner, storeId, [{ variantId, quantity }]);
        await queryRunner.commitTransaction();
        return;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    }

    // In-memory fallback with atomic check
    const store = this.defaultStores.find(s => s.id === storeId || s.code === storeId) || this.defaultStores[0];
    const key = `${store.id}:${variantId}`;
    const inv = this.memoryInventory.get(key) || { onHand: 10, reserved: 0 };
    const available = inv.onHand - inv.reserved;

    if (available < quantity) {
      throw new ConflictException(
        `Sản phẩm chỉ còn khả dụng ${available} chiếc tại ${store.name}, không đủ số lượng yêu cầu (${quantity}).`,
      );
    }

    inv.reserved += quantity;
    this.memoryInventory.set(key, inv);
  }

  async releaseStock(storeId: string, variantId: string, quantity: number): Promise<void> {
    const store = this.defaultStores.find(s => s.id === storeId || s.code === storeId) || this.defaultStores[0];
    const key = `${store.id}:${variantId}`;
    const inv = this.memoryInventory.get(key);
    if (inv) {
      inv.reserved = Math.max(0, inv.reserved - quantity);
      this.memoryInventory.set(key, inv);
    }
  }
}
