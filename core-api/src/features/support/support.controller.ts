import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
} from '@nestjs/common';
import { SupportService, CreateTicketDTO } from './support.service';
import { CurrentUser, AuthenticatedUser } from '../../shared/decorators/current-user.decorator';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  async createTicket(
    @Body() dto: CreateTicketDTO,
    @CurrentUser() user?: AuthenticatedUser,
    @Headers('x-customer-id') headerCustomerId?: string,
  ) {
    const customerId = user?.id || headerCustomerId || '00000000-0000-0000-0000-000000000002';
    return this.supportService.createTicket(customerId, dto);
  }

  @Get('tickets')
  async getTickets(
    @CurrentUser() user?: AuthenticatedUser,
    @Headers('x-customer-id') headerCustomerId?: string,
  ) {
    const customerId = user?.id || headerCustomerId || '00000000-0000-0000-0000-000000000002';
    return this.supportService.getCustomerTickets(customerId);
  }

  @Get('tickets/:id')
  async getTicket(
    @Param('id') ticketId: string,
    @CurrentUser() user?: AuthenticatedUser,
    @Headers('x-customer-id') headerCustomerId?: string,
  ) {
    const customerId = user?.id || headerCustomerId || '00000000-0000-0000-0000-000000000002';
    return this.supportService.getTicket(ticketId, customerId);
  }
}

