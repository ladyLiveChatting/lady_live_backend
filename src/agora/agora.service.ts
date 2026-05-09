import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RtcRole, RtcTokenBuilder } from 'agora-token';

@Injectable()
export class AgoraService {
  constructor(private readonly config: ConfigService) {}

  /** RTC token for Video/Voice SDK (integer UID). */
  buildRtcToken(channelName: string, uid: number) {
    const appId =
      this.config.get<string>('AGORA_APP_ID')?.trim() ||
      process.env.AGORA_APP_ID?.trim();
    const appCertificate =
      this.config.get<string>('AGORA_APP_CERTIFICATE')?.trim() ||
      process.env.AGORA_APP_CERTIFICATE?.trim();
    if (!appId || !appCertificate) {
      throw new ServiceUnavailableException(
        'Agora is not configured (set AGORA_APP_ID and AGORA_APP_CERTIFICATE)',
      );
    }

    const tokenTtlSec = Math.min(
      Math.max(Number(this.config.get('AGORA_TOKEN_TTL_SEC')) || 3600, 60),
      86400,
    );
    const privilegeTtlSec = Math.min(
      Math.max(Number(this.config.get('AGORA_PRIVILEGE_TTL_SEC')) || tokenTtlSec, 60),
      86400,
    );

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      tokenTtlSec,
      privilegeTtlSec,
    );

    return {
      appId,
      channelName,
      uid,
      token,
      tokenExpiresInSeconds: tokenTtlSec,
    };
  }
}
