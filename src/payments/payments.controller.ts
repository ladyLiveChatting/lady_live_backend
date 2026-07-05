import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
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
  constructor(private readonly payments: PaymentsService) {}

  @Post('create-order')
  @ApiOperation({ summary: 'Create Razorpay order and store PENDING payment' })
  createOrder(@CurrentUser() user: JwtUser, @Body() dto: CreateOrderDto) {
    return this.payments.createOrder(user.userId, dto);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify Razorpay payment signature' })
  verify(
    @CurrentUser() user: JwtUser,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.payments.verifyPayment(user.userId, dto);
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
