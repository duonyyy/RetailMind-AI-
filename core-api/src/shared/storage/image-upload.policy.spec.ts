import { assertValidUpload, detectBufferContentType } from './image-upload.policy';
import { BadRequestException } from '@nestjs/common';

describe('ImageUploadPolicy (Magic Bytes Validation)', () => {
  it('should detect valid JPEG magic bytes', () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectBufferContentType(jpegBuffer)).toBe('image/jpeg');
  });

  it('should detect valid PNG magic bytes', () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectBufferContentType(pngBuffer)).toBe('image/png');
  });

  it('should detect valid PDF magic bytes', () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 sample content');
    expect(detectBufferContentType(pdfBuffer)).toBe('application/pdf');
  });

  it('should throw BadRequestException when file size is 0', () => {
    expect(() =>
      assertValidUpload({
        buffer: Buffer.alloc(0),
        size: 0,
        mimetype: 'image/png',
      }),
    ).toThrow(BadRequestException);
  });

  it('should throw BadRequestException when binary content does not match declared mimetype', () => {
    // Declaring PNG but sending text content
    const spoofedBuffer = Buffer.from('<?php echo "malicious"; ?>');
    expect(() =>
      assertValidUpload({
        buffer: spoofedBuffer,
        size: spoofedBuffer.length,
        mimetype: 'image/png',
      }),
    ).toThrow(BadRequestException);
  });

  it('should succeed for valid PNG upload', () => {
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const result = assertValidUpload({
      buffer: validPngBuffer,
      size: validPngBuffer.length,
      mimetype: 'image/png',
    });
    expect(result.contentType).toBe('image/png');
    expect(result.extension).toBe('png');
  });
});
