import * as crypto from 'crypto';
import { BadRequestException } from '@nestjs/common';

export interface PreviewTokenPayload {
  customerId: string;
  storeId: string;
  items: Array<{ sku: string; quantity: number }>;
  subtotalVnd: string;
  discountVnd: string;
  vatVnd: string;
  totalVnd: string;
  exp: number; // Unix timestamp in seconds
}

export class PreviewTokenHelper {
  private static getSecret(): string {
    const secret = process.env.PREVIEW_TOKEN_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException('Chưa cấu hình khóa bảo mật Preview Token (PREVIEW_TOKEN_SECRET/JWT_SECRET).');
      }
      return 'retailmind_preview_token_dev_fallback_secret';
    }
    return secret;
  }

  /**
   * Sinh Signed Preview Token có thời hạn đúng 10 phút (600 giây)
   */
  static sign(payload: Omit<PreviewTokenPayload, 'exp'>, ttlSeconds = 600): { token: string; expiresAt: string } {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const fullPayload: PreviewTokenPayload = { ...payload, exp };

    const payloadJson = JSON.stringify(fullPayload);
    const payloadB64 = Buffer.from(payloadJson, 'utf-8').toString('base64url');

    const signature = crypto
      .createHmac('sha256', this.getSecret())
      .update(payloadB64)
      .digest('base64url');

    const token = `${payloadB64}.${signature}`;
    const expiresAt = new Date(exp * 1000).toISOString();

    return { token, expiresAt };
  }

  /**
   * Xác thực Preview Token: Kiểm tra tính toàn vẹn chữ ký và thời hạn hiệu lực 10 phút
   */
  static verify(token: string): PreviewTokenPayload {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Mã Signed Preview Token không được để trống.');
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      throw new BadRequestException('Định dạng Signed Preview Token không hợp lệ.');
    }

    const [payloadB64, providedSig] = parts;

    const expectedSig = crypto
      .createHmac('sha256', this.getSecret())
      .update(payloadB64)
      .digest('base64url');

    const bufProvided = Buffer.from(providedSig);
    const bufExpected = Buffer.from(expectedSig);

    if (
      bufProvided.length !== bufExpected.length ||
      !crypto.timingSafeEqual(bufProvided, bufExpected)
    ) {
      throw new BadRequestException(
        'Chữ ký Signed Preview Token không hợp lệ. Giá hoặc số lượng có thể đã bị sửa đổi!',
      );
    }

    let payload: PreviewTokenPayload;
    try {
      const decoded = Buffer.from(payloadB64, 'base64url').toString('utf-8');
      payload = JSON.parse(decoded);
    } catch {
      throw new BadRequestException('Nội dung Signed Preview Token không thể giải mã.');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new BadRequestException(
        'Bản xem trước đơn hàng (Preview Token) đã quá hạn 10 phút. Vui lòng tạo lại bản xem trước mới.',
      );
    }

    return payload;
  }
}

