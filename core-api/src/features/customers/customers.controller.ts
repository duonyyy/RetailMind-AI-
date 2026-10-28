import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  NotFoundException,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CurrentUser, AuthenticatedUser } from '../../shared/decorators/current-user.decorator';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('me')
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const customerId = user.id;
    const profile = await this.customersService.getProfile(customerId);
    if (!profile) {
      throw new NotFoundException('Không tìm thấy thông tin khách hàng.');
    }
    return profile;
  }

  @Get('favorites')
  async getFavorites(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const customerId = user.id;
    const favorites = await this.customersService.getFavorites(customerId);
    return { customerId, favorites };
  }

  @Post('favorites/toggle')
  async toggleFavorite(
    @Body('variantId') variantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const customerId = user.id;
    return this.customersService.toggleFavorite(customerId, variantId);
  }
}

