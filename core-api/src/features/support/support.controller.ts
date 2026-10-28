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
import { Roles } from '../../shared/decorators/roles.decorator';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @Roles('CUSTOMER')
  async createTicket(
    @Body() dto: CreateTicketDTO,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const customerId = user.id;
    return this.supportService.createTicket(customerId, dto);
  }

  @Get('tickets')
  async getTickets(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const customerId = user.id;
    return this.supportService.getCustomerTickets(customerId);
  }

  @Get('tickets/:id')
  async getTicket(
    @Param('id') ticketId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const customerId = user.id;
    return this.supportService.getTicket(ticketId, customerId);
  }
}

