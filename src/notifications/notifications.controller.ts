import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SendBoysPushDto } from './dto/send-boys-push.dto';
import { SendGirlsPushDto } from './dto/send-girls-push.dto';
import { PushApiSecretGuard } from './guards/push-api-secret.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Public()
  @Post('push/boys')
  @UseGuards(PushApiSecretGuard)
  @ApiOperation({
    summary: 'Send FCM push to boys app users',
    description:
      'Requires header `X-Push-Api-Secret` (value from PUSH_API_SECRET). ' +
      'Targets users with role BOY or GUEST who saved an FCM token (guest login or POST /users/me/device). ' +
      'Omit userId to broadcast to all such users.',
  })
  @ApiHeader({
    name: 'X-Push-Api-Secret',
    required: true,
    description: 'Must match server env PUSH_API_SECRET',
  })
  sendBoysPush(@Body() dto: SendBoysPushDto) {
    return this.notifications.sendBoysPush(dto);
  }

  @Public()
  @Post('push/girls')
  @UseGuards(PushApiSecretGuard)
  @ApiOperation({
    summary: 'Send FCM push to girls app users',
    description:
      'Requires header `X-Push-Api-Secret` (value from PUSH_API_SECRET). ' +
      'Targets users with role GIRL who saved an FCM token (login/register or POST /users/me/device). ' +
      'Omit userId to broadcast to all such users.',
  })
  @ApiHeader({
    name: 'X-Push-Api-Secret',
    required: true,
    description: 'Must match server env PUSH_API_SECRET',
  })
  sendGirlsPush(@Body() dto: SendGirlsPushDto) {
    return this.notifications.sendGirlsPush(dto);
  }
}
