import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AgoraService } from './agora.service';
import { RtcTokenDto } from './dto/rtc-token.dto';

@ApiTags('integrations')
@Controller('integrations/agora')
export class AgoraController {
  constructor(private readonly agora: AgoraService) {}

  @Post('rtc-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mint short-lived Agora RTC token (Video/Voice SDK)' })
  rtcToken(@Body() dto: RtcTokenDto) {
    return this.agora.buildRtcToken(dto.channelName, dto.uid);
  }
}
