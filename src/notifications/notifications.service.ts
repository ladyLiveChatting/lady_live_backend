import { Injectable } from '@nestjs/common';
import { UserRole } from '../prisma-client';
import { PrismaClient } from '../prisma-client';
import { FcmService } from './fcm.service';
import { SendBoysPushDto } from './dto/send-boys-push.dto';
import { SendGirlsPushDto } from './dto/send-girls-push.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly fcm: FcmService,
  ) {}

  async sendBoysPush(dto: SendBoysPushDto) {
    const where = {
      role: { in: [UserRole.BOY, UserRole.GUEST] },
      pushToken: { not: null },
      ...(dto.userId ? { id: dto.userId } : {}),
    };

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, pushToken: true },
    });

    const tokens = users
      .map((u) => u.pushToken)
      .filter((t): t is string => t != null && t.length > 0);

    const results = await this.fcm.sendBoysToTokens(tokens, {
      title: dto.title,
      body: dto.body,
      data: dto.data,
    });

    return this.buildPushResponse(users.length, tokens.length, results);
  }

  async sendGirlsPush(dto: SendGirlsPushDto) {
    const where = {
      role: UserRole.GIRL,
      pushToken: { not: null },
      ...(dto.userId ? { id: dto.userId } : {}),
    };

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, pushToken: true },
    });

    const tokens = users
      .map((u) => u.pushToken)
      .filter((t): t is string => t != null && t.length > 0);

    const results = await this.fcm.sendGirlsToTokens(tokens, {
      title: dto.title,
      body: dto.body,
      data: dto.data,
    });

    return this.buildPushResponse(users.length, tokens.length, results);
  }

  private buildPushResponse(
    targetedUsers: number,
    tokensAttempted: number,
    results: Awaited<ReturnType<FcmService['sendBoysToTokens']>>,
  ) {
    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      ok: true as const,
      targetedUsers,
      tokensAttempted,
      sent,
      failed,
      results: results.map((r) => ({
        success: r.success,
        messageId: r.messageId,
        error: r.error,
        tokenPreview: `${r.token.slice(0, 8)}…`,
      })),
    };
  }
}
