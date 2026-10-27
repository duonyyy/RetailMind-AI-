import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { AuthService, UserDTO } from '../auth/public-api';

@Injectable()
export class CustomersService {
  // In-memory fallback for favorites
  private memoryFavorites: Map<string, Set<string>> = new Map();

  constructor(
    private readonly authService: AuthService,
    @Optional()
    @InjectRepository(Favorite)
    private readonly favoriteRepo?: Repository<Favorite>,
  ) {}

  async getProfile(customerId: string): Promise<UserDTO> {
    const profile = await this.authService.getProfile(customerId);
    if (!profile) {
      // Anti-enumeration: 404
      throw new NotFoundException('Không tìm thấy thông tin khách hàng.');
    }
    return profile;
  }

  async getFavorites(customerId: string): Promise<string[]> {
    if (this.favoriteRepo) {
      const records = await this.favoriteRepo.find({ where: { customer_id: customerId } });
      return records.map((r) => r.variant_id);
    }
    const set = this.memoryFavorites.get(customerId) || new Set();
    return Array.from(set);
  }

  async toggleFavorite(customerId: string, variantId: string): Promise<{ isFavorited: boolean }> {
    if (this.favoriteRepo) {
      const existing = await this.favoriteRepo.findOne({
        where: { customer_id: customerId, variant_id: variantId },
      });
      if (existing) {
        await this.favoriteRepo.delete({ customer_id: customerId, variant_id: variantId });
        return { isFavorited: false };
      } else {
        await this.favoriteRepo.save({ customer_id: customerId, variant_id: variantId });
        return { isFavorited: true };
      }
    }

    let set = this.memoryFavorites.get(customerId);
    if (!set) {
      set = new Set();
      this.memoryFavorites.set(customerId, set);
    }

    if (set.has(variantId)) {
      set.delete(variantId);
      return { isFavorited: false };
    } else {
      set.add(variantId);
      return { isFavorited: true };
    }
  }
}

