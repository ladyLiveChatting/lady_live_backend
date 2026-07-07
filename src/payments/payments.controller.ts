import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly payments: PaymentsService) {}

  @Post('create-order')
  @ApiOperation({ summary: 'Create Razorpay order and store PENDING payment' })
  async createOrder(@CurrentUser() user: JwtUser, @Body() dto: CreateOrderDto) {
    this.logger.log(`POST /payments/create-order - userId: ${user.userId}, amount: ${dto.amount}, coins: ${dto.coins}`);
    try {
      const result = await this.payments.createOrder(user.userId, dto);
      this.logger.log(`Order created successfully: ${result.orderId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create order: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify Razorpay payment signature' })
  async verify(
    @CurrentUser() user: JwtUser,
    @Body() dto: VerifyPaymentDto,
  ) {
    this.logger.log(`POST /payments/verify - userId: ${user.userId}, orderId: ${dto.razorpay_order_id}`);
    try {
      const result = await this.payments.verifyPayment(user.userId, dto);
      this.logger.log(`Payment verification result: ${result.success}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to verify payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('history/:userId')
  @ApiOperation({ summary: 'List payment history for a user' })
  history(@CurrentUser() user: JwtUser, @Param('userId') userId: string) {
    if (user.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.payments.history(userId);
  }
}
