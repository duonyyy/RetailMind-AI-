import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as crypto from 'crypto';

@Injectable()
export class MinioStorageService implements OnModuleInit {
  private readonly logger = new Logger(MinioStorageService.name);
  private client: Minio.Client | null = null;
  private readonly defaultBucket: string;
  private isAvailable = false;

  constructor(private configService: ConfigService) {
    const endPoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = parseInt(this.configService.get<string>('MINIO_PORT', '9000'), 10);
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin');
    this.defaultBucket = this.configService.get<string>('MINIO_BUCKET', 'retailmind-documents');

    try {
      this.client = new Minio.Client({
        endPoint,
        port,
        useSSL,
        accessKey,
        secretKey,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to initialize MinIO client: ${err?.message}`);
    }
  }

  async onModuleInit() {
    if (!this.client) return;
    try {
      const exists = await this.client.bucketExists(this.defaultBucket).catch(() => false);
      if (!exists) {
        await this.client.makeBucket(this.defaultBucket, 'us-east-1').catch(() => {});
        this.logger.log(`Created MinIO bucket: ${this.defaultBucket}`);
      }
      this.isAvailable = true;
      this.logger.log(`MinIO connected and bucket '${this.defaultBucket}' is ready`);
    } catch (err: any) {
      this.logger.warn(`MinIO connection unavailable (${err.message}). Falling back to local storage mock.`);
    }
  }

  async uploadDocument(
    fileName: string,
    buffer: Buffer,
    contentType = 'application/octet-stream'
  ): Promise<{ objectKey: string; checksumSha256: string; sizeBytes: number }> {
    const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const objectKey = `${checksumSha256.substring(0, 12)}_${fileName}`;

    if (this.client && this.isAvailable) {
      await this.client.putObject(this.defaultBucket, objectKey, buffer, buffer.length, {
        'Content-Type': contentType,
        'X-Amz-Meta-Checksum-Sha256': checksumSha256,
      });
    }

    return {
      objectKey,
      checksumSha256,
      sizeBytes: buffer.length,
    };
  }

  async getDocumentBuffer(objectKey: string): Promise<Buffer | null> {
    if (!this.client || !this.isAvailable) return null;
    try {
      const stream = await this.client.getObject(this.defaultBucket, objectKey);
      const chunks: Buffer[] = [];
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    } catch (err: any) {
      this.logger.error(`Error reading document ${objectKey}: ${err.message}`);
      return null;
    }
  }
}
