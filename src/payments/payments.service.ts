import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, PaymentStatus, WalletTxType } from '../prisma-client';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

const Razorpay = require('razorpay');

@Injectable()
export class PaymentsService {
  private readonly razorpay: any;
  private readonly keyId: string;
  private readonly keySecret: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaClient,
  ) {
    this.keyId = this.config.get<string>('RAZORPAY_KEY_ID')?.trim() ?? '';
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET')?.trim() ?? '';
    if (!this.keyId || !this.keySecret) {
      throw new InternalServerErrorException(
        'Razorpay credentials are not configured',
      );
    }
    this.razorpay = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    const currency = dto.currency?.toUpperCase() ?? 'INR';
    const paymentAmount = dto.amount * 100;
    const coins = dto.coins ?? 0;

    if (paymentAmount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const order = await this.razorpay.orders.create({
      amount: paymentAmount,
      currency,
      receipt: `receipt_${userId}_${Date.now()}`,
      payment_capture: 1,
    });

    await this.prisma.payment.create({
      data: {
        userId,
        orderId: order.id,
        amount: paymentAmount,
        coins,
        currency,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      key: this.keyId,
      orderId: order.id,
      amount: paymentAmount,
      currency,
    };
  }

  async verifyPayment(userId: string, dto: VerifyPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId: dto.razorpay_order_id },
    });
    if (!payment) {
      throw new NotFoundException('Payment order not found');
    }
    if (payment.userId !== userId) {
      throw new BadRequestException('User mismatch for this payment');
    }

    const expectedSignature = this.generateSignature(
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
    );

    const verified = expectedSignature === dto.razorpay_signature;
    const status = verified ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;

    if (payment.status === PaymentStatus.SUCCESS && verified) {
      return {
        success: true,
        message: 'Payment already verified successfully',
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { orderId: dto.razorpay_order_id },
        data: {
          paymentId: dto.razorpay_payment_id,
          signature: dto.razorpay_signature,
          status,
        },
      });

      const coins = (payment as { coins?: number }).coins ?? 0;
      if (verified && coins > 0) {
        await tx.wallet.upsert({
          where: { userId },
          create: { userId, balance: coins },
          update: { balance: { increment: coins } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: userId,
            amount: coins,
            type: WalletTxType.CREDIT,
            note: 'razorpay_topup',
          },
        });
      }
    });

    return {
      success: verified,
      message: verified
        ? 'Payment Verified Successfully'
        : 'Payment verification failed',
    };
  }

  async history(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private generateSignature(orderId: string, paymentId: string) {
    return require('crypto')
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }
}
