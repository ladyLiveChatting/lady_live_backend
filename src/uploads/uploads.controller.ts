import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../prisma-client';
import { UploadsService } from './uploads.service';
import { PresignImageDto } from './dto/presign-image.dto';

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  @Post('images/presign')
  @ApiOperation({
    summary: 'Presigned PUT URL for profile image (girls only)',
    description:
      'Returns uploadUrl (temporary), fileUrl (permanent public R2 URL), headers, expiresInSeconds.',
  })
  presignImage(@CurrentUser() u: JwtUser, @Body() dto: PresignImageDto) {
    return this.uploads.presignForGirl(u.userId, u.role as UserRole, dto);
  }
}
