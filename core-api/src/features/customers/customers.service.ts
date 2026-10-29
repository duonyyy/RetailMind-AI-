import { Injectable, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { AuthService, UserDTO } from '../auth/public-api';

@Injectable()
export class CustomersService {
  constructor(
    private readonly authService: AuthService,
    @Optional()
    @InjectRepository(Favorite)
    private readonly favoriteRepo?: Repository<Favorite>,
  ) {}

  private getRepo(): Repository<Favorite> {
    if (!this.favoriteRepo) {
      throw new ServiceUnavailableException('Dịch vụ quản lý yêu thích hiện không khả dụng.');
    }
    return this.favoriteRepo;
  }

  async getProfile(customerId: string): Promise<UserDTO> {
    const profile = await this.authService.getProfile(customerId);
    if (!profile) {
      throw new NotFoundException('Không tìm thấy thông tin khách hàng.');
    }
    return profile;
  }

  async getFavorites(customerId: string): Promise<string[]> {
    const records = await this.getRepo().find({ where: { customer_id: customerId } });
    return records.map((r) => r.variant_id);
  }

  async toggleFavorite(customerId: string, variantId: string): Promise<{ isFavorited: boolean }> {
    return this.setFavorite(customerId, variantId, 'toggle');
  }

  async setFavorite(
    customerId: string,
    variantId: string,
    action: 'add' | 'remove' | 'toggle' = 'toggle',
  ): Promise<{ isFavorited: boolean }> {
    const repo = this.getRepo();
    const existing = await repo.findOne({
      where: { customer_id: customerId, variant_id: variantId },
    });

    if (action === 'add') {
      if (!existing) {
        await repo.save(
          repo.create({ customer_id: customerId, variant_id: variantId }),
        );
      }
      return { isFavorited: true };
    }

    if (action === 'remove') {
      if (existing) {
        await repo.delete({ customer_id: customerId, variant_id: variantId });
      }
      return { isFavorited: false };
    }

    // 'toggle'
    if (existing) {
      await repo.delete({ customer_id: customerId, variant_id: variantId });
      return { isFavorited: false };
    } else {
      await repo.save(
        repo.create({ customer_id: customerId, variant_id: variantId }),
      );
      return { isFavorited: true };
    }
  }
}
