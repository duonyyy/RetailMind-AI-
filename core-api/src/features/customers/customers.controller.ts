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
    @CurrentUser() user?: AuthenticatedUser,
    @Headers('x-customer-id') headerCustomerId?: string,
  ) {
    const customerId = user?.id || headerCustomerId || '00000000-0000-0000-0000-000000000002';
    const profile = await this.customersService.getProfile(customerId);
    if (!profile) {
      throw new NotFoundException('Không tìm thấy thông tin khách hàng.');
    }
    return profile;
  }

  @Get('favorites')
  async getFavorites(
    @CurrentUser() user?: AuthenticatedUser,
    @Headers('x-customer-id') headerCustomerId?: string,
  ) {
    const customerId = user?.id || headerCustomerId || '00000000-0000-0000-0000-000000000002';
    const favorites = await this.customersService.getFavorites(customerId);
    return { customerId, favorites };
  }

  @Post('favorites/toggle')
  async toggleFavorite(
    @Body('variantId') variantId: string,
    @CurrentUser() user?: AuthenticatedUser,
    @Headers('x-customer-id') headerCustomerId?: string,
  ) {
    const customerId = user?.id || headerCustomerId || '00000000-0000-0000-0000-000000000002';
    return this.customersService.toggleFavorite(customerId, variantId);
  }
}

