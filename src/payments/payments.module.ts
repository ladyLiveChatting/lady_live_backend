import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService, ConfigService],
})
export class PaymentsModule {}
