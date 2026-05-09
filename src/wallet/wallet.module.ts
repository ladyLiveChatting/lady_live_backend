import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

@Module({
  controllers: [WalletController],
  providers: [WalletService, RolesGuard],
  exports: [WalletService],
})
export class WalletModule {}
