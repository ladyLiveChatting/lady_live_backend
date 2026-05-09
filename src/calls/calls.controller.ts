import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WithdrawDto } from './dto/withdraw.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../prisma-client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import { CallsService } from './calls.service';
import { EndCallDto } from './dto/end-call.dto';

@ApiTags('calls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsController {
  constructor(private calls: CallsService) {}

  @Post('request/:calleeId')
  request(@CurrentUser() u: JwtUser, @Param('calleeId') calleeId: string) {
    return this.calls.request(u.userId, calleeId);
  }

  @Post(':id/accept')
  accept(@CurrentUser() u: JwtUser, @Param('id') id: string) {
    return this.calls.accept(u.userId, id);
  }

  @Post(':id/reject')
  reject(@CurrentUser() u: JwtUser, @Param('id') id: string) {
    return this.calls.reject(u.userId, id);
  }

  @Post(':id/end')
  end(
    @CurrentUser() u: JwtUser,
    @Param('id') id: string,
    @Body() body: EndCallDto,
  ) {
    return this.calls.end(u.userId, id, body.durationSeconds);
  }

  @Get('history')
  history(@CurrentUser() u: JwtUser) {
    return this.calls.history(u.userId);
  }

  @Get('earnings/summary')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GIRL)
  earnings(@CurrentUser() u: JwtUser) {
    return this.calls.earningsSummary(u.userId);
  }

  @Post('earnings/withdraw')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GIRL)
  withdraw(@CurrentUser() u: JwtUser, @Body() body: WithdrawDto) {
    return this.calls.withdrawalDummy(u.userId, body.note);
  }
}
