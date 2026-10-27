import { BadRequestException } from '@nestjs/common';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

const FILE_EXTENSION_MAP: Record<AllowedContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/**
 * Kiểm tra tính hợp lệ của tệp tải lên theo chuẩn bảo mật Foodee:
 * 1. Kiểm tra kích thước tệp.
 * 2. Đọc trực tiếp Buffer Magic Bytes thay vì tin cậy client mimetype header.
 * 3. Chống giả mạo MIME type và Webshell injection.
 */
export function assertValidUpload(
  file: { buffer: Buffer; mimetype?: string; size: number },
): { contentType: AllowedContentType; extension: string } {
  if (!file.size || file.size > MAX_UPLOAD_BYTES) {
    throw new BadRequestException(`Dung lượng tệp tải lên phải từ 1 byte đến tối đa ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB`);
  }

  const detectedContentType = detectBufferContentType(file.buffer);
  if (!detectedContentType || !ALLOWED_CONTENT_TYPES.includes(detectedContentType)) {
    throw new BadRequestException('Định dạng tệp không được hỗ trợ. Chỉ chấp nhận JPEG, PNG, WebP và PDF.');
  }

  if (file.mimetype && file.mimetype !== detectedContentType) {
    throw new BadRequestException(
      `Nội dung nhị phân thực tế (${detectedContentType}) không khớp với tiêu đề khai báo (${file.mimetype}). Tệp bị từ chối vì lý do an ninh!`,
    );
  }

  return {
    contentType: detectedContentType,
    extension: FILE_EXTENSION_MAP[detectedContentType],
  };
}

/**
 * Phát hiện kiểu nội dung dựa trên Magic Bytes ở đầu buffer
 */
export function detectBufferContentType(buffer: Buffer): AllowedContentType | undefined {
  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }

  // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  // PDF: %PDF (bytes 0-3)
  if (
    buffer.length >= 4 &&
    buffer.subarray(0, 4).toString('ascii') === '%PDF'
  ) {
    return 'application/pdf';
  }

  return undefined;
}
