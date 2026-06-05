import { existsSync } from 'fs';
import { join, resolve } from 'path';
import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export type FcmSendPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export type FcmSendResult = {
  token: string;
  success: boolean;
  messageId?: string;
  error?: string;
};

type FcmTarget = 'boys' | 'girls';

const FCM_APP_NAMES: Record<FcmTarget, string> = {
  boys: 'meet-connect-boys',
  girls: 'meet-connect-girls',
};

const FCM_ENV_KEYS: Record<FcmTarget, string> = {
  boys: 'FIREBASE_SERVICE_ACCOUNT_PATH',
  girls: 'FIREBASE_GIRLS_SERVICE_ACCOUNT_PATH',
};

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private readonly messaging = new Map<FcmTarget, admin.messaging.Messaging>();

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.initFirebaseApp('boys');
    this.initFirebaseApp('girls');
  }

  private resolveCredentialsPath(envKey: string): string | null {
    const raw =
      this.config.get<string>(envKey)?.trim() ||
      process.env[envKey]?.trim();
    if (!raw) return null;
    return resolve(raw.startsWith('/') ? raw : join(process.cwd(), raw));
  }

  private initFirebaseApp(target: FcmTarget) {
    const envKey = FCM_ENV_KEYS[target];
    const appName = FCM_APP_NAMES[target];
    const credPath = this.resolveCredentialsPath(envKey);

    if (!credPath || !existsSync(credPath)) {
      this.logger.warn(
        `FCM (${target}) disabled: set ${envKey} (resolved: ${credPath ?? 'empty'}). ` +
          'Restart the server after updating .env / .env.development.',
      );
      return;
    }

    try {
      const existing = admin.apps.find((a) => a?.name === appName);
      const app =
        existing ??
        admin.initializeApp(
          {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            credential: admin.credential.cert(
              require(credPath) as admin.ServiceAccount,
            ),
          },
          appName,
        );
      this.messaging.set(target, admin.messaging(app));
      this.logger.log(`FCM (${target}) initialized (credentials: ${credPath})`);
    } catch (err) {
      this.logger.error(`FCM (${target}) init failed`, err);
    }
  }

  isReady(target: FcmTarget): boolean {
    return this.messaging.has(target);
  }

  async sendBoysToTokens(
    tokens: string[],
    payload: FcmSendPayload,
  ): Promise<FcmSendResult[]> {
    return this.sendToTokens('boys', tokens, payload);
  }

  async sendGirlsToTokens(
    tokens: string[],
    payload: FcmSendPayload,
  ): Promise<FcmSendResult[]> {
    return this.sendToTokens('girls', tokens, payload);
  }

  /** Public URL for Lady Live image (FCM + admin push). */
  private resolvePushImageUrl(): string | undefined {
    const explicit = this.config
      .get<string>('PUSH_NOTIFICATION_IMAGE_URL')
      ?.trim();
    if (explicit) return explicit;

    const base =
      this.config.get<string>('PUBLIC_API_BASE_URL')?.trim() ||
      process.env.PUBLIC_API_BASE_URL?.trim();
    if (!base) return undefined;
    return `${base.replace(/\/$/, '')}/static/push-notification.png`;
  }

  private async sendToTokens(
    target: FcmTarget,
    tokens: string[],
    payload: FcmSendPayload,
  ): Promise<FcmSendResult[]> {
    const messaging = this.messaging.get(target);
    if (!messaging) {
      throw new ServiceUnavailableException(
        `Push notifications (${target}) are not configured. Set ${FCM_ENV_KEYS[target]}.`,
      );
    }

    const unique = [...new Set(tokens.filter((t) => t && t.length > 0))];
    if (unique.length === 0) return [];

    const imageUrl = this.resolvePushImageUrl();
    const data: Record<string, string> = {
      ...payload.data,
      ...(imageUrl ? { image: imageUrl } : {}),
    };
    const results: FcmSendResult[] = [];

    for (const token of unique) {
      try {
        const messageId = await messaging.send({
          token,
          notification: {
            title: payload.title,
            body: payload.body,
            ...(imageUrl ? { imageUrl } : {}),
          },
          data,
          android: {
            priority: 'high',
            notification: {
              channelId: 'default',
              priority: 'high' as const,
              ...(imageUrl ? { imageUrl } : {}),
            },
          },
          apns: {
            headers: { 'apns-priority': '10' },
            fcmOptions: imageUrl ? { imageUrl } : undefined,
            payload: {
              aps: {
                alert: {
                  title: payload.title,
                  body: payload.body,
                },
                sound: 'default',
                ...(imageUrl ? { 'mutable-content': 1 } : {}),
              },
            },
          },
        });
        results.push({ token, success: true, messageId });
      } catch (err) {
        const error =
          err instanceof Error ? err.message : 'Unknown FCM send error';
        this.logger.warn(
          `FCM (${target}) send failed for token ${token.slice(0, 12)}…: ${error}`,
        );
        results.push({ token, success: false, error });
      }
    }

    return results;
  }
}
