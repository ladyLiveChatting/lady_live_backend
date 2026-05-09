import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, UserRole } from '../prisma-client';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaClient) {}

  async me(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, wallet: true },
    });
    if (!u) throw new NotFoundException();
    return u;
  }

  async updateProfile(userId: string, role: UserRole, dto: UpdateProfileDto) {
    const data: Record<string, unknown> = {};
    if (dto.displayName !== undefined) data.displayName = dto.displayName;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.age !== undefined) data.age = dto.age;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.isOnline !== undefined) {
      data.isOnline = dto.isOnline;
      data.lastSeenAt = new Date();
    }
    if (dto.coinsPerMinute !== undefined && role === UserRole.GIRL) {
      data.coinsPerMinute = dto.coinsPerMinute;
    }
    await this.prisma.profile.update({
      where: { userId },
      data,
    });
    return this.me(userId);
  }
}
