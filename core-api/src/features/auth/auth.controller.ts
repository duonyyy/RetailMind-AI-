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
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { user: result.user };
  }

  @Public()
  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.authService.login(email, password);

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
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    return { user: result.user };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Body('refreshToken') bodyToken?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const token = bodyToken || this.refreshCookie(req);
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
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    return { success: true };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Body('refreshToken') bodyToken: string, @Res({ passthrough: true }) res: Response) {
    await this.authService.revokeRefreshToken(bodyToken || this.refreshCookie(req));
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/' });
    return { success: true, message: 'Đăng xuất thành công.' };
  }

  @Get('me')
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('authorization') authHeader?: string,
  ) {
    const userId = user.id;
    return this.authService.getProfile(userId);
  }
  private refreshCookie(req: Request): string | undefined {
    const entry = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('refresh_token='));
    if (!entry) return undefined;
    try { return decodeURIComponent(entry.slice('refresh_token='.length)); } catch { return undefined; }
  }

}
