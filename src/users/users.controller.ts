import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../prisma-client';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

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
