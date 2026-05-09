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
    const call = await this.prisma.call.create({
      data: {
        callerId,
        calleeId,
        status: CallStatus.REQUESTED,
      },
    });
    const girlBaseCoinsPerMinute = callee.profile.coinsPerMinute;
    const boysVisibleCoinsPerMinute =
      computeBoysVisibleCoinsPerMinute(girlBaseCoinsPerMinute);
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
  async end(callerId: string, callId: string, durationSeconds: number) {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: { callee: { include: { profile: true } } },
    });
    if (!call || call.callerId !== callerId) throw new ForbiddenException();
    if (call.status !== CallStatus.ACCEPTED) throw new BadRequestException();

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

  /** Net coins credited to girl wallets from ended calls (after company share). */
  async earningsSummary(calleeId: string) {
    const agg = await this.prisma.call.aggregate({
      where: { calleeId, status: CallStatus.ENDED },
      // Cast: older generated clients may omit billing fields from `CallSumAggregateInputType` until `prisma generate`.
      _sum: { coinsGirlFinal: true } as unknown as Prisma.CallSumAggregateInputType,
      _count: true,
    });
    /** Prisma `_sum` shape for this aggregate; avoids `Pick<>` when client types lag schema. */
    const sum = agg._sum as { coinsGirlFinal?: number | null } | null;
    return {
      totalCoinsEarned: sum?.coinsGirlFinal ?? 0,
      completedCalls: agg._count,
    };
  }
}
