import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../prisma-client';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { PresignImageDto } from '../uploads/dto/presign-image.dto';
import { UploadsService } from '../uploads/uploads.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private users: UsersService,
    private uploads: UploadsService,
  ) {}

  @Get('me')
  me(@CurrentUser() u: JwtUser) {
    return this.users.me(u.userId);
  }

  @Patch('me')
  update(
    @CurrentUser() u: JwtUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.users.updateProfile(u.userId, u.role as UserRole, dto);
  }

  @Post('me/upload-url')
  @ApiOperation({
    summary: 'Presigned PUT URL for avatar or gallery (girls app)',
    description:
      'Same as POST /uploads/images/presign. JWT required; boys receive 403.',
  })
  uploadUrl(@CurrentUser() u: JwtUser, @Body() dto: PresignImageDto) {
    return this.uploads.presignForGirl(u.userId, u.role as UserRole, dto);
  }

  @Post('me/device')
  @ApiOperation({
    summary: 'Register push token + device id',
    description:
      'Call after login. Optional FCM token when Firebase is configured on the client.',
  })
  registerDevice(@CurrentUser() u: JwtUser, @Body() dto: RegisterDeviceDto) {
    return this.users.registerDevice(u.userId, dto);
  }

  @Public()
  @Get('me/notificationHistory')
  @ApiOperation({
    summary: 'Hello + live lady lists (no auth)',
    description: 'Public endpoint; no Bearer token required.',
  })
  notificationHistory() {
    return {
      hello: ['Hello live', 'Hello lady'],
      liveLady: ['Live stream ready', 'Lady online'],
    };
  }
}
