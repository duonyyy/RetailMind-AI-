import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InternalAgentController } from './internal-agent.controller';
import { InternalAgentService } from './internal-agent.service';
import { CatalogService, Variant } from '../catalog/public-api';
import { InventoryService } from '../inventory/public-api';
import { OrdersService } from '../orders/public-api';
import { ConfigService } from '@nestjs/config';
import { InternalSecretGuard } from '../../shared/guards/internal-secret.guard';
import { ForbiddenException, ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { createMockVariantRepository } from '../../test/test-bed.helper';

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

  describe('InternalSecretGuard', () => {
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

  describe('Internal Tool Endpoints', () => {
    it('should search products and return typed envelope', async () => {
      const res = await controller.catalogSearch({ query: 'Asus' });
      expect(res.status).toBe('success');
      expect(res.tool).toBe('catalog_search');
      expect(res.data.count).toBeGreaterThan(0);
      expect(res.data.laptops[0].brand.toUpperCase()).toBe('ASUS');
    });

    it('does not present simulated inventory as authoritative', async () => {
      await expect(controller.inventoryCheck({ sku: 'LT-ASUS-VIVO15-OLED' })).rejects.toThrow(ServiceUnavailableException);
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

    it('fails closed for unverified cart, order and ticket operations', async () => {
      await expect(controller.cartView('customer')).rejects.toThrow(ServiceUnavailableException);
      await expect(controller.cartAdd({ sku: 'ABC', quantity: 1 }, 'customer')).rejects.toThrow(ServiceUnavailableException);
      await expect(controller.cartRemove({ sku: 'ABC' }, 'customer')).rejects.toThrow(ServiceUnavailableException);
      await expect(controller.orderPreview({ sku: 'ABC' })).rejects.toThrow(ServiceUnavailableException);
      await expect(controller.orderStatus({ order_id: 'ORD-100201' })).rejects.toThrow(ServiceUnavailableException);
      await expect(controller.orderCancel({ order_id: 'ORD-100201', reason: 'test' })).rejects.toThrow(ServiceUnavailableException);
      await expect(controller.ticketCreate({ title: 'title', description: 'description' }, 'customer')).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
