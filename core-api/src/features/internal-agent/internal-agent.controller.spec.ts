import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InternalAgentController } from './internal-agent.controller';
import { InternalAgentService } from './internal-agent.service';
import { CatalogService, Variant } from '../catalog/public-api';
import { InventoryService } from '../inventory/public-api';
import { OrdersService } from '../orders/public-api';
import { CartService } from '../cart/public-api';
import { SupportService } from '../support/public-api';
import { CustomersService } from '../customers/public-api';
import { ConfigService } from '@nestjs/config';
import { InternalSecretGuard } from '../../shared/guards/internal-secret.guard';
import { ForbiddenException, ExecutionContext, BadRequestException } from '@nestjs/common';
import { createMockVariantRepository } from '../../test/test-bed.helper';

describe('InternalAgentGateway (Phase 5: Unlocked Tools & Anti-IDOR Security)', () => {
  let controller: InternalAgentController;
  let service: InternalAgentService;
  let guard: InternalSecretGuard;
  let configService: ConfigService;

  const mockInventoryService = {
    getStores: jest.fn().mockResolvedValue([
      { id: 'store-1', code: 'MWG_HCM_001', name: 'Chi nhánh Q1', address: '128 Trần Quang Khải' },
    ]),
    getStock: jest.fn().mockResolvedValue({
      storeId: 'store-1',
      storeName: 'Thế Giới Di Động Nguyễn Thị Minh Khai - Quận 1',
      variantId: 'var-asus-vivobook-15',
      onHandQty: 42,
      reservedQty: 2,
      availableQty: 40,
      isAvailable: true,
    }),
  };

  const mockOrdersService = {
    calculatePreview: jest.fn().mockResolvedValue({
      items: [{ sku: 'LT-ASUS-VIVO15-OLED', quantity: 1, unitPriceVnd: '17990000', lineTotalVnd: '17990000' }],
      subtotalVnd: '17990000',
      discountVnd: '0',
      vatVnd: '1799000',
      totalVnd: '19789000',
      formattedTotal: '19.789.000 ₫',
      previewToken: 'preview.token.valid.hmac',
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    }),
    getOrder: jest.fn().mockImplementation((id: string, principal?: any) => {
      return Promise.resolve({
        orderId: '00000000-0000-0000-0000-000000000001',
        orderNo: id,
        status: 'placed',
        storeId: 'store-1',
        customerId: principal?.id || 'cust-1',
        totalVnd: '19789000',
        formattedTotal: '19.789.000 ₫',
        itemsCount: 1,
        confirmedAt: new Date().toISOString(),
        items: [{ sku: 'LT-ASUS-VIVO15-OLED', quantity: 1, unitPriceVnd: '17990000', lineTotalVnd: '17990000' }],
      });
    }),
    cancelOrder: jest.fn().mockResolvedValue({
      success: true,
      orderId: '00000000-0000-0000-0000-000000000001',
      orderNo: 'ORD-100201',
      status: 'CANCELLED',
      message: 'Đơn hàng ORD-100201 đã được hủy.',
    }),
  };

  const mockCartService = {
    getCart: jest.fn().mockImplementation((customerId: string) => {
      return Promise.resolve({
        id: 'cart-1',
        customerId,
        status: 'active',
        itemsCount: 1,
        subtotalVnd: '17990000',
        vatVnd: '1799000',
        totalVnd: '19789000',
        formattedTotal: '19.789.000 ₫',
        items: [{
          id: 'ci-1',
          sku: 'LT-ASUS-VIVO15-OLED',
          name: 'Laptop Asus Vivobook 15 OLED A1505VA',
          variantId: 'var-asus-vivobook-15',
          unitPriceVnd: '17990000',
          formattedUnitPrice: '17.990.000 ₫',
          quantity: 1,
          lineTotalVnd: '17990000',
          formattedLineTotal: '17.990.000 ₫',
          availableStock: 40,
          inStock: true,
        }],
        updatedAt: new Date().toISOString(),
      });
    }),
    addItem: jest.fn().mockResolvedValue({}),
    removeItem: jest.fn().mockResolvedValue({}),
  };

  const mockSupportService = {
    createTicket: jest.fn().mockResolvedValue({
      id: 'ticket-uuid-1',
      ticketCode: 'TCK-20261029-9988',
      orderId: 'ORD-100201',
      customerId: 'cust-1',
      title: 'Máy lỗi màn hình',
      description: 'Màn hình bị nháy sọc tím',
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    }),
  };

  const mockCustomersService = {
    getProfile: jest.fn().mockResolvedValue({
      id: 'cust-1',
      email: 'customer@example.com',
      fullName: 'Nguyễn Văn Khách',
      role: 'CUSTOMER',
      phone: '0912345678',
      permissions: ['order:create'],
    }),
    setFavorite: jest.fn().mockImplementation((customerId: string, variantId: string, action: string) => {
      return Promise.resolve({
        isFavorited: action === 'add' ? true : action === 'remove' ? false : true,
      });
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalAgentController],
      providers: [
        InternalAgentService,
        CatalogService,
        InternalSecretGuard,
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
        {
          provide: CartService,
          useValue: mockCartService,
        },
        {
          provide: SupportService,
          useValue: mockSupportService,
        },
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
        {
          provide: getRepositoryToken(Variant),
          useValue: createMockVariantRepository(),
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'INTERNAL_TOOL_SECRET' || key === 'INTERNAL_API_SECRET') {
                return 'secret_token_internal_retailmind';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<InternalAgentController>(InternalAgentController);
    service = module.get<InternalAgentService>(InternalAgentService);
    guard = module.get<InternalSecretGuard>(InternalSecretGuard);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('InternalSecretGuard (Constant-Time Verification)', () => {
    it('should grant access when X-Internal-Secret matches', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/internal/tools/catalog-search',
            headers: {
              'x-internal-secret': 'secret_token_internal_retailmind',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should throw ForbiddenException when X-Internal-Secret is wrong or missing', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/internal/tools/catalog-search',
            headers: {
              'x-internal-secret': 'wrong_secret',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });

  describe('Phase 5 Unlocked Tools (Real Service Integration)', () => {
    it('1. catalogSearch should return typed envelope and matched products', async () => {
      const res = await controller.catalogSearch({ query: 'Asus' });
      expect(res.status).toBe('success');
      expect(res.tool).toBe('catalog_search');
      expect(res.data.count).toBeGreaterThan(0);
      expect(res.data.laptops[0].brand.toUpperCase()).toBe('ASUS');
    });

    it('2. productDetail should return full product specifications', async () => {
      const res = await controller.productDetail({ sku: 'LT-ASUS-VIVO15-OLED' });
      expect(res.status).toBe('success');
      expect(res.tool).toBe('get_product_details');
      expect(res.data.sku).toBe('LT-ASUS-VIVO15-OLED');
      expect(res.data.priceVnd).toBe('17990000');
    });

    it('3. compareProducts should compare 2-4 laptops', async () => {
      const res = await controller.compareProducts({
        skus: ['LT-ASUS-VIVO15-OLED', 'LT-DELL-INSP14-5430'],
      });
      expect(res.status).toBe('success');
      expect(res.tool).toBe('compare_products');
      expect(res.data.total).toBe(2);
    });

    it('4. inventoryCheck should query real stock without 503 error', async () => {
      const res = await controller.inventoryCheck({
        sku: 'LT-ASUS-VIVO15-OLED',
        store_id: 'MWG_HCM_001',
      });
      expect(res.status).toBe('success');
      expect(res.tool).toBe('inventory_check');
      expect(res.data.available_qty).toBe(40);
      expect(res.data.is_in_stock).toBe(true);
      expect(mockInventoryService.getStock).toHaveBeenCalled();
    });

    it('5. policySearch should return warranty and return policy', async () => {
      const res = await controller.policySearch({ query: 'đổi trả 30 ngày' });
      expect(res.status).toBe('success');
      expect(res.tool).toBe('search_policy');
      expect(res.data.count).toBeGreaterThan(0);
    });

    it('6. cartView should query customer cart from CartService', async () => {
      const res = await controller.cartView('cust-1');
      expect(res.status).toBe('success');
      expect(res.tool).toBe('view_cart');
      expect(res.data.customer_id).toBe('cust-1');
      expect(res.data.subtotal_vnd).toBe('17990000');
      expect(res.data.items).toHaveLength(1);
      expect(mockCartService.getCart).toHaveBeenCalledWith('cust-1');
    });

    it('7. cartAdd should add item to cart via CartService', async () => {
      const res = await controller.cartAdd({ sku: 'LT-ASUS-VIVO15-OLED', quantity: 2 }, 'cust-1');
      expect(res.status).toBe('success');
      expect(res.tool).toBe('add_to_cart');
      expect(res.data.status).toBe('success');
      expect(mockCartService.addItem).toHaveBeenCalled();
    });

    it('8. cartRemove should remove item from cart via CartService', async () => {
      const res = await controller.cartRemove({ sku: 'LT-ASUS-VIVO15-OLED' }, 'cust-1');
      expect(res.status).toBe('success');
      expect(res.tool).toBe('remove_from_cart');
      expect(res.data.status).toBe('success');
      expect(mockCartService.removeItem).toHaveBeenCalled();
    });

    it('9. orderPreview should calculate preview and issue previewToken', async () => {
      const res = await controller.orderPreview({ sku: 'LT-ASUS-VIVO15-OLED', quantity: 1 }, 'cust-1');
      expect(res.status).toBe('success');
      expect(res.tool).toBe('order_preview');
      expect(res.data.previewToken).toBe('preview.token.valid.hmac');
      expect(res.data.total_vnd).toBe('19789000');
      expect(mockOrdersService.calculatePreview).toHaveBeenCalled();
    });

    it('10. orderStatus should lookup real order from OrdersService', async () => {
      const res = await controller.orderStatus({ order_id: 'ORD-100201' }, 'cust-1');
      expect(res.status).toBe('success');
      expect(res.tool).toBe('get_order_status');
      expect(res.data.order_id).toBe('ORD-100201');
      expect(res.data.order_status).toBe('PLACED');
      expect(mockOrdersService.getOrder).toHaveBeenCalledWith('ORD-100201', { id: 'cust-1', role: 'CUSTOMER' });
    });

    it('11. orderCancel should execute cancellation with inventory restoration', async () => {
      const res = await controller.orderCancel({ order_id: 'ORD-100201', reason: 'Đổi ý' }, 'cust-1');
      expect(res.status).toBe('success');
      expect(res.tool).toBe('cancel_simulated_order');
      expect(res.data.order_id).toBe('ORD-100201');
      expect(res.data.inventory_restored).toBe(true);
      expect(mockOrdersService.cancelOrder).toHaveBeenCalledWith('ORD-100201', 'Đổi ý', { id: 'cust-1', role: 'CUSTOMER' });
    });

    it('12. ticketCreate should create support ticket via SupportService', async () => {
      const res = await controller.ticketCreate(
        { order_id: 'ORD-100201', title: 'Máy lỗi', description: 'Màn hình bị nháy' },
        'cust-1',
      );
      expect(res.status).toBe('success');
      expect(res.tool).toBe('create_support_ticket');
      expect(res.data.ticket_id).toBe('TCK-20261029-9988');
      expect(mockSupportService.createTicket).toHaveBeenCalled();
    });

    it('13. manageFavorite should support add, remove, and toggle actions', async () => {
      const addRes = await controller.manageFavorite(
        { sku: 'LT-ASUS-VIVO15-OLED', action: 'add' },
        'cust-1',
      );
      expect(addRes.status).toBe('success');
      expect(addRes.data.action).toBe('add');
      expect(addRes.data.is_favorited).toBe(true);
      expect(mockCustomersService.setFavorite).toHaveBeenCalledWith('cust-1', expect.any(String), 'add');

      const removeRes = await controller.manageFavorite(
        { sku: 'LT-ASUS-VIVO15-OLED', action: 'remove' },
        'cust-1',
      );
      expect(removeRes.status).toBe('success');
      expect(removeRes.data.action).toBe('remove');
      expect(removeRes.data.is_favorited).toBe(false);
      expect(mockCustomersService.setFavorite).toHaveBeenCalledWith('cust-1', expect.any(String), 'remove');
    });

    describe('Anti-IDOR Zero-Trust Customer Identity Validation', () => {
      it('fails closed when X-Customer-Id is missing or empty for customer-scoped tools', async () => {
        await expect(controller.cartView(undefined, undefined)).rejects.toThrow(BadRequestException);
        await expect(controller.cartAdd({ sku: 'ABC', quantity: 1 }, undefined)).rejects.toThrow(BadRequestException);
        await expect(controller.cartRemove({ sku: 'ABC' }, undefined)).rejects.toThrow(BadRequestException);
        await expect(controller.orderStatus({ order_id: 'ORD-100201' }, undefined)).rejects.toThrow(BadRequestException);
        await expect(controller.orderCancel({ order_id: 'ORD-100201' }, undefined)).rejects.toThrow(BadRequestException);
        await expect(controller.ticketCreate({ title: 't', description: 'd' }, undefined)).rejects.toThrow(BadRequestException);
        await expect(controller.manageFavorite({ sku: 'ABC' }, undefined)).rejects.toThrow(BadRequestException);
      });

      it('rejects guest_user placeholder for customer-scoped operations', async () => {
        await expect(controller.cartView('guest_user', undefined)).rejects.toThrow(BadRequestException);
        await expect(controller.cartAdd({ sku: 'ABC', quantity: 1 }, 'guest_user')).rejects.toThrow(BadRequestException);
        await expect(controller.orderStatus({ order_id: 'ORD-100201' }, 'guest_user')).rejects.toThrow(BadRequestException);
        await expect(controller.orderCancel({ order_id: 'ORD-100201' }, 'guest_user')).rejects.toThrow(BadRequestException);
        await expect(controller.ticketCreate({ title: 't', description: 'd' }, 'guest_user')).rejects.toThrow(BadRequestException);
        await expect(controller.manageFavorite({ sku: 'ABC' }, 'guest_user')).rejects.toThrow(BadRequestException);
      });

      it('rejects missing or guest identity in the service without calling the order service', async () => {
        mockOrdersService.getOrder.mockClear();
        mockOrdersService.cancelOrder.mockClear();
        for (const customerId of [undefined, '', '   ', 'guest_user', ' guest_user ']) {
          await expect(service.getOrderStatus({ order_id: 'ORD-100201' }, customerId)).rejects.toThrow(BadRequestException);
          await expect(service.cancelOrder({ order_id: 'ORD-100201' }, customerId)).rejects.toThrow(BadRequestException);
        }
        expect(mockOrdersService.getOrder).not.toHaveBeenCalled();
        expect(mockOrdersService.cancelOrder).not.toHaveBeenCalled();
      });
    });
  });
});
