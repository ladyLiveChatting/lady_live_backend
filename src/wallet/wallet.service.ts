import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, UserRole, WalletTxType } from '../prisma-client';
import { loadCoinPackages } from './wallet-packages.config';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: ConfigService,
  ) {}

  async getOrThrow(userId: string) {
    const w = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!w) throw new NotFoundException('Wallet not found');
    return w;
  }

  /** Dummy top-up for boys / guests */
  async addCoins(userId: string, role: UserRole, amount: number) {
    if (role === UserRole.GIRL) {
      return { error: 'Girls use earnings, not this wallet endpoint' };
    }
    const w = await this.getOrThrow(userId);
    const updated = await this.prisma.wallet.update({
      where: { userId },
      data: { balance: w.balance + amount },
    });
    await this.prisma.walletTransaction.create({
      data: {
        walletId: userId,
        amount,
        type: WalletTxType.CREDIT,
        note: 'dummy_topup',
      },
    });
    return updated;
  }

  async deduct(userId: string, amount: number, note: string, refCallId?: string) {
    const w = await this.getOrThrow(userId);
    if (w.balance < amount) return null;
    await this.prisma.wallet.update({
      where: { userId },
      data: { balance: w.balance - amount },
    });
    await this.prisma.walletTransaction.create({
      data: {
        walletId: userId,
        amount,
        type: WalletTxType.DEBIT,
        note,
        refCallId,
      },
    });
    return true;
  }

  /** Ensures a wallet row exists, then debits (e.g. girl short-call penalty). */
  async ensureWalletAndDeduct(
    userId: string,
    amount: number,
    note: string,
    refCallId?: string,
  ) {
    if (amount <= 0) return true;
    await this.prisma.wallet.upsert({
      where: { userId },
      create: { userId, balance: 0 },
      update: {},
    });
    return this.deduct(userId, amount, note, refCallId);
  }

  listPackages() {
    return loadCoinPackages(this.config);
  }

  async listTransactions(userId: string, limit = 50) {
    await this.getOrThrow(userId);
    const take = Math.min(Math.max(limit, 1), 100);
    return this.prisma.walletTransaction.findMany({
      where: { walletId: userId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /** Credit earnings (e.g. girl wallet after a call). Creates wallet if missing. */
  async credit(userId: string, amount: number, note: string, refCallId?: string) {
    if (amount <= 0) return;
    await this.prisma.wallet.upsert({
      where: { userId },
      create: { userId, balance: amount },
      update: { balance: { increment: amount } },
    });
    await this.prisma.walletTransaction.create({
      data: {
        walletId: userId,
        amount,
        type: WalletTxType.CREDIT,
        note,
        refCallId,
      },
    });
  }
}
