import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MessageType,
  PrismaClient,
  UserRole,
  WalletTxType,
} from '../prisma-client';
import { computeGiftSettlement } from '../billing/gift-coin-billing';
import {
  findGiftById,
  GiftCategory,
  listGifts,
} from './gift-catalog.config';

@Injectable()
export class GiftsService {
  constructor(private readonly prisma: PrismaClient) {}

  catalog(filter?: GiftCategory) {
    return listGifts(filter);
  }

  async sendGift(
    senderId: string,
    senderRole: UserRole,
    conversationId: string,
    giftId: string,
  ) {
    if (senderRole === UserRole.GIRL) {
      throw new ForbiddenException('Only boys can send gifts');
    }

    const gift = findGiftById(giftId);
    if (!gift) throw new NotFoundException('Gift not found');

    const members = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
      include: { user: true },
    });
    const senderMember = members.find((m) => m.userId === senderId);
    if (!senderMember) throw new ForbiddenException();

    const peer = members.find((m) => m.userId !== senderId);
    if (!peer) throw new BadRequestException('Invalid conversation');
    if (peer.user.role !== UserRole.GIRL) {
      throw new BadRequestException('Gifts can only be sent to girls');
    }

    const settlement = computeGiftSettlement(gift.priceCoins);

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: senderId } });
      if (!wallet || wallet.balance < gift.priceCoins) {
        throw new BadRequestException('Insufficient balance');
      }

      const newBalance = wallet.balance - gift.priceCoins;
      await tx.wallet.update({
        where: { userId: senderId },
        data: { balance: newBalance },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: senderId,
          amount: gift.priceCoins,
          type: WalletTxType.DEBIT,
          note: `gift_sent:${gift.id}`,
        },
      });

      await tx.wallet.upsert({
        where: { userId: peer.userId },
        create: { userId: peer.userId, balance: settlement.girlEarnedCoins },
        update: { balance: { increment: settlement.girlEarnedCoins } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: peer.userId,
          amount: settlement.girlEarnedCoins,
          type: WalletTxType.CREDIT,
          note: `gift_received:${gift.id}`,
        },
      });

      const body = `Sent ${gift.emoji} ${gift.name}`;
      const message = await tx.message.create({
        data: {
          conversationId,
          senderId,
          type: MessageType.GIFT,
          body,
          giftId: gift.id,
          giftName: gift.name,
          giftEmoji: gift.emoji,
          giftCoins: gift.priceCoins,
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return {
        message,
        settlement,
        newBalance,
        gift,
      };
    });
  }
}
