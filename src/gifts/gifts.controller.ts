import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../prisma-client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import { AppSocketGateway } from '../socket/socket.gateway';
import { GiftCategory } from './gift-catalog.config';
import { GiftsService } from './gifts.service';
import { SendGiftDto } from './dto/send-gift.dto';

@ApiTags('gifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gifts')
export class GiftsController {
  constructor(
    private gifts: GiftsService,
    private gateway: AppSocketGateway,
  ) {}

  @Get()
  @Roles(UserRole.BOY, UserRole.GUEST)
  @ApiOperation({ summary: 'Gift catalog (boys/guests only)' })
  list(@Query('filter') filter?: string) {
    const allowed: GiftCategory[] = ['all', 'popular', 'new'];
    const f = allowed.includes(filter as GiftCategory)
      ? (filter as GiftCategory)
      : 'all';
    return this.gifts.catalog(f);
  }

  @Post('send')
  @Roles(UserRole.BOY, UserRole.GUEST)
  @ApiOperation({
    summary: 'Send a gift in chat — debits boy, credits girl (70% after 30% cut)',
  })
  async send(@CurrentUser() u: JwtUser, @Body() dto: SendGiftDto) {
    const result = await this.gifts.sendGift(
      u.userId,
      u.role as UserRole,
      dto.conversationId,
      dto.giftId,
    );
    this.gateway.emitChatMessage(dto.conversationId, result.message);
    return {
      ok: true,
      message: result.message,
      newBalance: result.newBalance,
      settlement: result.settlement,
    };
  }
}
