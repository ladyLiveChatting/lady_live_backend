import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, UserRole } from '../prisma-client';
import { R2Service } from '../r2/r2.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';

const MAX_GALLERY = 3;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly r2: R2Service,
  ) {}

  async me(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, wallet: true },
    });
    if (!u) throw new NotFoundException();
    const { pushToken: _p, ...safe } = u;
    return this.normalizeProfilePayload(safe);
  }

  private normalizeProfilePayload<T extends { profile?: { galleryUrls?: unknown } | null }>(
    user: T,
  ): T {
    if (!user.profile) return user;
    const raw = user.profile.galleryUrls;
    const galleryUrls = this.parseGalleryUrls(raw);
    return {
      ...user,
      profile: {
        ...user.profile,
        galleryUrls,
      },
    };
  }

  private parseGalleryUrls(raw: unknown): string[] {
    if (raw == null) return [];
    if (Array.isArray(raw)) {
      return raw.filter((x): x is string => typeof x === 'string');
    }
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.filter((x): x is string => typeof x === 'string');
        }
      } catch {
        return [];
      }
    }
    return [];
  }

  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deviceId: dto.deviceId,
        ...(dto.fcmToken != null && dto.fcmToken !== ''
          ? { pushToken: dto.fcmToken }
          : {}),
      },
    });
    return { ok: true as const };
  }

  async updateProfile(userId: string, role: UserRole, dto: UpdateProfileDto) {
    if (dto.imageUrl !== undefined && dto.imageUrl !== '') {
      this.r2.assertAllowedPublicUrls([dto.imageUrl], 'imageUrl');
    }
    if (dto.galleryUrls !== undefined) {
      if (dto.galleryUrls.length > MAX_GALLERY) {
        throw new BadRequestException(`galleryUrls allows at most ${MAX_GALLERY} items`);
      }
      this.r2.assertAllowedPublicUrls(dto.galleryUrls, 'galleryUrls');
    }

    const data: Record<string, unknown> = {};
    if (dto.displayName !== undefined) data.displayName = dto.displayName;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.age !== undefined) data.age = dto.age;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.galleryUrls !== undefined) {
      data.galleryUrls = dto.galleryUrls;
    }
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
