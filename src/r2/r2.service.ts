import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { readR2Config, type R2Config } from './r2.config';

export type ProfileUploadKind = 'avatar' | 'gallery';

const CONTENT_TYPE_MAP: Record<
  string,
  { mime: string; ext: string }
> = {
  jpeg: { mime: 'image/jpeg', ext: 'jpg' },
  jpg: { mime: 'image/jpeg', ext: 'jpg' },
  png: { mime: 'image/png', ext: 'png' },
  webp: { mime: 'image/webp', ext: 'webp' },
  heic: { mime: 'image/heic', ext: 'heic' },
  heif: { mime: 'image/heif', ext: 'heif' },
};

@Injectable()
export class R2Service {
  private client: S3Client | null = null;
  private cfg: R2Config | null = null;

  private ensureReady(): R2Config {
    if (!this.cfg) {
      this.cfg = readR2Config();
    }
    if (!this.cfg) {
      throw new ServiceUnavailableException(
        'R2 is not configured. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL.',
      );
    }
    if (!this.client) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: this.cfg.endpoint,
        credentials: {
          accessKeyId: this.cfg.accessKeyId,
          secretAccessKey: this.cfg.secretAccessKey,
        },
      });
    }
    return this.cfg;
  }

  resolveContentType(raw: string): { mime: string; ext: string } {
    const key = raw.trim().toLowerCase().replace(/^image\//, '');
    const mapped = CONTENT_TYPE_MAP[key];
    if (!mapped) {
      throw new BadRequestException(
        'contentType must be one of: jpeg, png, webp, heic, heif',
      );
    }
    return mapped;
  }

  objectKey(userId: string, kind: ProfileUploadKind, ext: string): string {
    const id = randomUUID();
    const prefix = kind === 'avatar' ? 'avatar' : 'gallery';
    return `users/${userId}/${prefix}-${id}.${ext}`;
  }

  publicFileUrl(key: string): string {
    const cfg = this.ensureReady();
    return `${cfg.publicBaseUrl}/${key}`;
  }

  isAllowedPublicUrl(url: string): boolean {
    const cfg = readR2Config();
    if (!cfg) return false;
    const base = cfg.publicBaseUrl;
    const normalized = url.trim();
    if (!normalized.startsWith(`${base}/`)) return false;
    try {
      const u = new URL(normalized);
      const b = new URL(base);
      return u.protocol === b.protocol && u.host === b.host;
    } catch {
      return false;
    }
  }

  assertAllowedPublicUrls(urls: string[], label: string): void {
    for (const url of urls) {
      if (!this.isAllowedPublicUrl(url)) {
        throw new BadRequestException(
          `${label} must be a public URL under ${readR2Config()?.publicBaseUrl ?? 'R2_PUBLIC_BASE_URL'}`,
        );
      }
    }
  }

  async presignProfileUpload(input: {
    userId: string;
    kind: ProfileUploadKind;
    contentType: string;
  }) {
    const cfg = this.ensureReady();
    const { mime, ext } = this.resolveContentType(input.contentType);
    const key = this.objectKey(input.userId, input.kind, ext);
    const command = new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      ContentType: mime,
    });
    const uploadUrl = await getSignedUrl(this.client!, command, {
      expiresIn: cfg.presignExpiresSeconds,
    });
    const fileUrl = this.publicFileUrl(key);
    return {
      uploadUrl,
      fileUrl,
      headers: { 'Content-Type': mime },
      expiresInSeconds: cfg.presignExpiresSeconds,
      key,
    };
  }
}
