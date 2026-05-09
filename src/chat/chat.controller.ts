import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private chat: ChatService) {}

  @Post('dm/:peerId')
  ensureDm(@CurrentUser() u: JwtUser, @Param('peerId') peerId: string) {
    return this.chat.ensureDm(u.userId, peerId);
  }

  @Get('conversations')
  list(@CurrentUser() u: JwtUser) {
    return this.chat.listConversations(u.userId);
  }

  @Get('conversations/:id/messages')
  messages(@CurrentUser() u: JwtUser, @Param('id') id: string) {
    return this.chat.listMessages(id, u.userId);
  }

  @Post('conversations/:id/messages')
  send(
    @CurrentUser() u: JwtUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.appendMessage(id, u.userId, dto.body);
  }

  @Post('conversations/:id/read')
  read(@CurrentUser() u: JwtUser, @Param('id') id: string) {
    return this.chat.markRead(id, u.userId);
  }
}
