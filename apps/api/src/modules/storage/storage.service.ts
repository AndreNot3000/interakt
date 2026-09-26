import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export interface PresignedUploadUrl {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

// Security: whitelist of allowed MIME types — reject anything not in this list
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;

export const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('storage.bucket', 'interakt');
    this.publicUrl = this.configService.get<string>(
      'storage.publicUrl',
      'http://localhost:9000',
    );

    this.s3 = new S3Client({
      endpoint: this.configService.get<string>('storage.endpoint'),
      region: this.configService.get<string>('storage.region', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('storage.accessKey', 'minioadmin'),
        secretAccessKey: this.configService.get<string>('storage.secretKey', 'minioadmin'),
      },
      forcePathStyle: true, // Required for MinIO compatibility
    });
  }

  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created storage bucket: ${this.bucket}`);
      } catch (err: any) {
        this.logger.warn(`Could not create bucket ${this.bucket}: ${err.message}`);
      }
    }

    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicRead',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      };
      await this.s3.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucket,
          Policy: JSON.stringify(policy),
        }),
      );
    } catch (err: any) {
      this.logger.debug(`Bucket policy notice: ${err.message}`);
    }
  }

  /**
   * Generates a presigned URL for client-side direct upload to S3.
   * Clients upload directly to storage — the API server is never the upload proxy.
   *
   * @param folder - Storage folder prefix (e.g., 'avatars', 'resources/pdf')
   * @param mimeType - MIME type validated against allowlist
   * @param expiresIn - URL validity in seconds (default: 1 hour)
   */
  async getPresignedUploadUrl(
    folder: string,
    mimeType: string,
    expiresIn = 3600,
    fileName?: string,
  ): Promise<PresignedUploadUrl> {
    this.validateMimeType(mimeType);

    const ext = this.mimeTypeToExtension(mimeType);
    const cleanFileName = fileName
      ? `${uuidv4().slice(0, 8)}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      : `${uuidv4()}${ext}`;
    const key = `${folder}/${cleanFileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });

    return { uploadUrl, key, expiresIn };
  }

  /**
   * Generates a presigned URL for reading a private file.
   */
  async getPresignedReadUrl(key: string, expiresIn = 3600, inline = false): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: inline ? 'inline' : undefined,
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  /**
   * Deletes a file from storage. Logs errors but does not throw —
   * missing files should not cause request failures.
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      this.logger.log(`Deleted storage object: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete storage object: ${key}`, error);
    }
  }

  /** Returns the public CDN/S3 URL for a key. Use only for public assets. */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${this.bucket}/${key}`;
  }

  private validateMimeType(mimeType: string): void {
    if (!ALLOWED_FILE_TYPES.includes(mimeType as (typeof ALLOWED_FILE_TYPES)[number])) {
      throw new BadRequestException({
        code: 'INVALID_FILE_TYPE',
        message: `File type not allowed: ${mimeType}. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`,
      });
    }
  }

  private mimeTypeToExtension(mimeType: string): string {
    const extensionMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    };
    return extensionMap[mimeType] ?? '';
  }
}
