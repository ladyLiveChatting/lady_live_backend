import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
  balance(@CurrentUser() u: JwtUser) {
    return this.wallet.getOrThrow(u.userId);
  }

  @Post('add')
  @Roles(UserRole.BOY, UserRole.GUEST)
  add(@CurrentUser() u: JwtUser, @Body() dto: AddCoinsDto) {
    return this.wallet.addCoins(u.userId, u.role as UserRole, dto.amount);
  }
}
