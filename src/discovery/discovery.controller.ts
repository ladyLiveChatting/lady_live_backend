import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../prisma-client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import { DiscoveryService } from './discovery.service';

@ApiTags('discovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('discovery')
export class DiscoveryController {
  constructor(private discovery: DiscoveryService) {}

  @Get('online')
  @ApiQuery({ name: 'minAge', required: false })
  @ApiQuery({ name: 'maxAge', required: false })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({
    name: 'includeOffline',
    required: false,
    description: 'Girls app: include BOY/GUEST even when profile.isOnline is false',
  })
  async online(
    @CurrentUser() u: JwtUser,
    @Query('minAge') minAge?: string,
    @Query('maxAge') maxAge?: string,
    @Query('country') country?: string,
    @Query('includeOffline') includeOffline?: string,
  ) {
    const min = minAge ? parseInt(minAge, 10) : undefined;
    const max = maxAge ? parseInt(maxAge, 10) : undefined;
    const withOffline =
      includeOffline === 'true' ||
      includeOffline === '1' ||
      includeOffline === 'yes';
    if (u.role === UserRole.GIRL) {
      return this.discovery.onlineBoysForGirl(min, max, country, withOffline);
    }
    return this.discovery.onlineForViewer(u.role as UserRole, min, max, country);
  }
}
