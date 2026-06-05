import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../prisma-client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import { WalletService } from './wallet.service';
import { AddCoinsDto } from './dto/add-coins.dto';

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('wallet')
export class WalletController {
  constructor(private wallet: WalletService) {}

  @Get()
  @Roles(UserRole.BOY, UserRole.GUEST)
  @ApiOperation({ summary: 'Boy/guest wallet balance' })
  balance(@CurrentUser() u: JwtUser) {
    return this.wallet.getOrThrow(u.userId);
  }

  @Get('packages')
  @Roles(UserRole.BOY, UserRole.GUEST)
  @ApiOperation({ summary: 'Coin top-up packages (from WALLET_COIN_PACKAGES env)' })
  packages() {
    return this.wallet.listPackages();
  }

  @Get('transactions')
  @Roles(UserRole.BOY, UserRole.GUEST)
  @ApiOperation({ summary: 'Recent wallet transactions' })
  transactions(
    @CurrentUser() u: JwtUser,
    @Query('limit') limit?: string,
  ) {
    const n = limit != null ? Number(limit) : 50;
    return this.wallet.listTransactions(u.userId, Number.isFinite(n) ? n : 50);
  }

  @Post('add')
  @Roles(UserRole.BOY, UserRole.GUEST)
  @ApiOperation({ summary: 'Dummy top-up until payment gateway is wired' })
  add(@CurrentUser() u: JwtUser, @Body() dto: AddCoinsDto) {
    return this.wallet.addCoins(u.userId, u.role as UserRole, dto.amount);
  }
}
