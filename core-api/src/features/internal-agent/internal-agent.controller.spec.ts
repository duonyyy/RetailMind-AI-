import { Test, TestingModule } from '@nestjs/testing';
import { InternalAgentController } from './internal-agent.controller';
import { InternalAgentService } from './internal-agent.service';
import { CatalogService } from '../catalog/public-api';
import { InventoryService } from '../inventory/public-api';
import { OrdersService } from '../orders/public-api';
import { ConfigService } from '@nestjs/config';
import { InternalSecretGuard } from '../../shared/guards/internal-secret.guard';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';

describe('InternalAgentGateway (Inter-Service Security & 13 Tools)', () => {
  let controller: InternalAgentController;
  let service: InternalAgentService;
  let guard: InternalSecretGuard;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalAgentController],
      providers: [
        InternalAgentService,
        CatalogService,
        InventoryService,
        OrdersService,
        InternalSecretGuard,
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

  describe('InternalSecretGuard', () => {
    it('should grant access when X-Internal-Secret matches', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
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
            headers: {
              'x-internal-secret': 'wrong_secret',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });

  describe('Internal Tool Endpoints', () => {
    it('should search products and return typed envelope', async () => {
      const res = await controller.catalogSearch({ query: 'Asus' });
      expect(res.status).toBe('success');
      expect(res.tool).toBe('catalog_search');
      expect(res.data.count).toBeGreaterThan(0);
      expect(res.data.laptops[0].brand.toUpperCase()).toBe('ASUS');
    });

    it('should check inventory for SKU', async () => {
      const res = await controller.inventoryCheck({ sku: 'LT-ASUS-VIVO15-OLED' });
      expect(res.status).toBe('success');
      expect(res.tool).toBe('inventory_check');
      expect(res.data.sku).toBe('LT-ASUS-VIVO15-OLED');
      expect(res.data.is_in_stock).toBe(true);
    });

    it('should calculate commercial contract penalty capped at 8% (Dieu 301 LTM)', async () => {
      const res = await controller.penaltyCalculate({
        breach_value_vnd: 100000000,
        agreed_rate_pct: 12,
      });
      expect(res.status).toBe('success');
      expect(res.tool).toBe('penalty_calculate');
      expect(res.data.is_capped_by_statute).toBe(true);
      expect(res.data.applied_rate_pct).toBe('8%');
      expect(res.data.penalty_amount_vnd).toBe('8000000');
    });

    it('should view, add and remove items from customer cart with IDOR protection', async () => {
      const customerId = 'cust-uuid-42';
      // 1. Add item
      const addRes = await controller.cartAdd(
        { sku: 'LT-ASUS-VIVO15-OLED', quantity: 2 },
        customerId,
      );
      expect(addRes.status).toBe('success');
      expect(addRes.data.cart.total_items).toBe(2);

      // 2. View cart
      const viewRes = await controller.cartView(customerId);
      expect(viewRes.data.customer_id).toBe(customerId);
      expect(viewRes.data.items.length).toBe(1);

      // 3. Remove item
      const removeRes = await controller.cartRemove(
        { sku: 'LT-ASUS-VIVO15-OLED' },
        customerId,
      );
      expect(removeRes.data.cart.total_items).toBe(0);
    });

    it('should create support ticket for complaint or warranty', async () => {
      const res = await controller.ticketCreate(
        {
          order_id: 'ORD-999001',
          title: 'Khiếu nại đổi trả máy lỗi',
          description: 'Máy bị sọc màn hình khi mới bóc hộp',
        },
        'cust-uuid-42',
      );
      expect(res.status).toBe('success');
      expect(res.data.ticket_id).toBeDefined();
      expect(res.data.ticket.status).toBe('OPEN');
    });
  });
});
