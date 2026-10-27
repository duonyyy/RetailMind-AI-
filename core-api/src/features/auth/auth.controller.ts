import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService, UserRole } from './auth.service';
import { Public } from '../../shared/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../../shared/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('fullName') fullName: string,
    @Body('phone') phone: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register({ email, password, fullName, phone });

    // Set secure HttpOnly cookies
    res.cookie('access_token', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return result;
  }

  @Public()
  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password?: string,
    @Body('role') role?: UserRole,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.authService.login(email, password, role);

    if (res && res.cookie) {
      res.cookie('access_token', result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      });
      res.cookie('refresh_token', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth/refresh',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    return result;
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Body('refreshToken') bodyToken?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const token = bodyToken || req.cookies?.refresh_token;
    const newTokens = await this.authService.refreshToken(token);

    if (res && res.cookie) {
      res.cookie('access_token', newTokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      });
      res.cookie('refresh_token', newTokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth/refresh',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    return newTokens;
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
    return { success: true, message: 'Đăng xuất thành công.' };
  }

  @Get('me')
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('authorization') authHeader?: string,
  ) {
    const userId = user?.id || '00000000-0000-0000-0000-000000000002';
    return this.authService.getProfile(userId);
  }
}
