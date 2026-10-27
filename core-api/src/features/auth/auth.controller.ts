import { Controller, Post, Get, Body, Headers } from '@nestjs/common';
import { AuthService, UserRole } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body('email') email: string, @Body('role') role?: UserRole) {
    return this.authService.login(email, role);
  }

  @Get('me')
  async getProfile(@Headers('authorization') authHeader?: string) {
    return this.authService.getProfile('usr-customer-01');
  }
}
