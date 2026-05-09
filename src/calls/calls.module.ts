import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { WalletModule } from '../wallet/wallet.module';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [WalletModule],
  controllers: [CallsController],
  providers: [CallsService, RolesGuard],
  exports: [CallsService],
})
export class CallsModule {}
