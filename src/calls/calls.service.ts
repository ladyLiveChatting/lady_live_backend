import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CallStatus, Prisma, PrismaClient, UserRole } from '../prisma-client';
import { WalletService } from '../wallet/wallet.service';
import {
  computeBoysVisibleCoinsPerMinute,
  computeCallCoinBilling,
} from '../billing/call-coin-billing';

@Injectable()
export class CallsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly wallet: WalletService,
  ) {}

  async request(callerId: string, calleeId: string) {
    if (callerId === calleeId) throw new BadRequestException();
    const callee = await this.prisma.user.findUnique({
      where: { id: calleeId },
      include: { profile: true },
    });
    if (!callee?.profile) throw new NotFoundException();

    const girlBaseCoinsPerMinute = callee.profile.coinsPerMinute;
    const boysVisibleCoinsPerMinute =
      computeBoysVisibleCoinsPerMinute(girlBaseCoinsPerMinute);

    const caller = await this.prisma.user.findUnique({
      where: { id: callerId },
      include: { wallet: true },
    });
    if (
      caller &&
      (caller.role === UserRole.BOY || caller.role === UserRole.GUEST)
    ) {
      const balance = caller.wallet?.balance ?? 0;
      if (balance < boysVisibleCoinsPerMinute) {
        throw new BadRequestException(
          `Insufficient coins (need at least ${boysVisibleCoinsPerMinute} for 1 minute)`,
        );
      }
    }

    const call = await this.prisma.call.create({
      data: {
        callerId,
        calleeId,
        status: CallStatus.REQUESTED,
      },
    });
    return {
      call,
      girlBaseCoinsPerMinute,
      boysVisibleCoinsPerMinute,
      /** @deprecated Use boysVisibleCoinsPerMinute — per-minute coins the caller pays. */
      rate: boysVisibleCoinsPerMinute,
    };
  }

  async accept(userId: string, callId: string) {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call || call.calleeId !== userId) throw new ForbiddenException();
    if (call.status !== CallStatus.REQUESTED) throw new BadRequestException();
    return this.prisma.call.update({
      where: { id: callId },
      data: { status: CallStatus.ACCEPTED, acceptedAt: new Date() },
    });
  }

  async reject(userId: string, callId: string) {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call || call.calleeId !== userId) throw new ForbiddenException();
    return this.prisma.call.update({
      where: { id: callId },
      data: { status: CallStatus.REJECTED, endedAt: new Date() },
    });
  }

  /**
   * End call: boosted per-minute billing, boy/guest debit, girl net credit,
   * snapshot fields on `Call`. Returns `{ call, billing }` for HTTP + socket clients.
   */
  async end(userId: string, callId: string, durationSeconds: number) {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: { callee: { include: { profile: true } } },
    });
    if (
      !call ||
      (call.callerId !== userId && call.calleeId !== userId)
    ) {
      throw new ForbiddenException();
    }
    if (call.status !== CallStatus.ACCEPTED) throw new BadRequestException();

    const callerId = call.callerId;

    const girlBaseCoinsPerMinute = call.callee.profile?.coinsPerMinute ?? 60;
    const billing = computeCallCoinBilling({
      girlBaseCoinsPerMinute,
      durationSeconds,
    });
    const {
      boysVisibleCoinsPerMinute,
      chargedMinutes,
      boysDeductedCoins,
      girlsGrossCoins,
      companyDeductionCoins,
      girlsFinalCoins,
    } = billing;

    const caller = await this.prisma.user.findUnique({
      where: { id: callerId },
    });
    if (caller?.role === UserRole.BOY || caller?.role === UserRole.GUEST) {
      const ok = await this.wallet.deduct(
        callerId,
        boysDeductedCoins,
        'call_simulation',
        callId,
      );
      if (!ok) throw new BadRequestException('Insufficient coins');
    }
    if (call.callee.role === UserRole.GIRL && girlsFinalCoins > 0) {
      await this.wallet.credit(
        call.calleeId,
        girlsFinalCoins,
        'call_earnings',
        callId,
      );
    }
    if (
      call.callee.role === UserRole.GIRL &&
      billing.isShortCall &&
      billing.girlShortCallPenaltyCoins > 0
    ) {
      const okPen = await this.wallet.ensureWalletAndDeduct(
        call.calleeId,
        billing.girlShortCallPenaltyCoins,
        'short_call_girl_penalty',
        callId,
      );
      if (!okPen) {
        throw new BadRequestException(
          'Insufficient coins for short-call penalty',
        );
      }
    }

    // Cast: stale `Prisma.CallUncheckedUpdateInput` may omit billing columns until `prisma generate` matches `schema.prisma`.
    const endCallData = {
      status: CallStatus.ENDED,
      endedAt: new Date(),
      durationSeconds,
      coinsSpent: boysDeductedCoins,
      girlBaseCoinsPerMinute,
      boysVisibleCoinsPerMinute,
      chargedMinutes,
      coinsGirlGross: girlsGrossCoins,
      coinsCompanyDeduction: companyDeductionCoins,
      coinsGirlFinal: girlsFinalCoins,
    } as unknown as Prisma.CallUncheckedUpdateInput;
    const updated = await this.prisma.call.update({
      where: { id: callId },
      data: endCallData,
    });
    return { call: updated, billing };
  }

  async history(userId: string) {
    return this.prisma.call.findMany({
      where: { OR: [{ callerId: userId }, { calleeId: userId }] },
      orderBy: { requestedAt: 'desc' },
      take: 100,
      include: {
        caller: { include: { profile: true } },
        callee: { include: { profile: true } },
      },
    });
  }

  /** Dummy payout request — no payment gateway. */
  async withdrawalDummy(calleeId: string, note?: string) {
    return {
      ok: true,
      userId: calleeId,
      status: 'queued',
      note: note ?? 'manual_payout',
    };
  }

  private periodStart(daysBack: number): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - daysBack);
    return d;
  }

  private monthStart(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    return d;
  }

  private async earningsAggregate(
    calleeId: string,
    since?: Date,
  ): Promise<{ coins: number; calls: number; callTimeSeconds: number }> {
    const where: Prisma.CallWhereInput = {
      calleeId,
      status: CallStatus.ENDED,
      ...(since ? { endedAt: { gte: since } } : {}),
    };
    const agg = await this.prisma.call.aggregate({
      where,
      _sum: {
        coinsGirlFinal: true,
        durationSeconds: true,
      } as unknown as Prisma.CallSumAggregateInputType,
      _count: true,
    });
    const sum = agg._sum as {
      coinsGirlFinal?: number | null;
      durationSeconds?: number | null;
    } | null;
    return {
      coins: sum?.coinsGirlFinal ?? 0,
      calls: agg._count,
      callTimeSeconds: sum?.durationSeconds ?? 0,
    };
  }

  /** Girl earnings dashboard — wallet + period stats from ended calls. */
  async earningsSummary(calleeId: string) {
    const weekStart = this.periodStart(
      (new Date().getDay() + 6) % 7,
    );
    const monthStart = this.monthStart();

    const [profile, walletRow, lifetime, week, month] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId: calleeId } }),
      this.prisma.wallet.findUnique({ where: { userId: calleeId } }),
      this.earningsAggregate(calleeId),
      this.earningsAggregate(calleeId, weekStart),
      this.earningsAggregate(calleeId, monthStart),
    ]);

    return {
      walletBalance: walletRow?.balance ?? 0,
      coinsPerMinute: profile?.coinsPerMinute ?? 0,
      totalCoinsEarned: lifetime.coins,
      completedCalls: lifetime.calls,
      callTimeSeconds: lifetime.callTimeSeconds,
      thisWeekCoins: week.coins,
      thisWeekCalls: week.calls,
      thisMonthCoins: month.coins,
      thisMonthCalls: month.calls,
    };
  }
}
