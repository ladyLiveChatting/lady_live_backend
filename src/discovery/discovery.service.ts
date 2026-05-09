import { Injectable } from '@nestjs/common';
import { PrismaClient, UserRole } from '../prisma-client';
import { computeBoysVisibleCoinsPerMinute } from '../billing/call-coin-billing';

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Boys / guests see girls; girls see boys (BOY role). */
  async onlineForViewer(viewerRole: UserRole, minAge?: number, maxAge?: number, country?: string) {
    const targetRole =
      viewerRole === UserRole.GIRL ? UserRole.BOY : UserRole.GIRL;
    const rows = await this.prisma.user.findMany({
      where: {
        role: targetRole,
        profile: {
          isOnline: true,
          ...(country ? { country } : {}),
          // Include profiles with unknown age (null); plain gte/lte excludes them in SQL.
          ...(minAge != null || maxAge != null
            ? {
                OR: [
                  { age: null },
                  {
                    age: {
                      ...(minAge != null ? { gte: minAge } : {}),
                      ...(maxAge != null ? { lte: maxAge } : {}),
                    },
                  },
                ],
              }
            : {}),
        },
      },
      include: { profile: true },
      take: 100,
    });
    return rows.map((u) => {
      const base = u.profile?.coinsPerMinute ?? 60;
      const isGirlProfile = targetRole === UserRole.GIRL;
      return {
        userId: u.id,
        displayName: u.profile?.displayName,
        age: u.profile?.age,
        country: u.profile?.country,
        bio: u.profile?.bio,
        imageUrl: u.profile?.imageUrl,
        isOnline: u.profile?.isOnline,
        coinsPerMinute: base,
        ...(isGirlProfile
          ? {
              boysVisibleCoinsPerMinute:
                computeBoysVisibleCoinsPerMinute(base),
            }
          : {}),
      };
    });
  }

  /** Guests count as "boys" for discovery from girls app — include GUEST + BOY */
  async onlineBoysForGirl(
    minAge?: number,
    maxAge?: number,
    country?: string,
    /** When false (default): only profiles marked online. When true: all boys/guests (MVP / empty DB UX). */
    includeOffline?: boolean,
  ) {
    const rows = await this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.BOY, UserRole.GUEST] },
        profile: {
          ...(includeOffline ? {} : { isOnline: true }),
          ...(country ? { country } : {}),
          ...(minAge != null || maxAge != null
            ? {
                OR: [
                  { age: null },
                  {
                    age: {
                      ...(minAge != null ? { gte: minAge } : {}),
                      ...(maxAge != null ? { lte: maxAge } : {}),
                    },
                  },
                ],
              }
            : {}),
        },
      },
      include: { profile: true },
      take: 100,
    });
    return rows.map((u) => ({
      userId: u.id,
      role: u.role,
      displayName: u.profile?.displayName,
      age: u.profile?.age,
      country: u.profile?.country,
      bio: u.profile?.bio,
      imageUrl: u.profile?.imageUrl,
      isOnline: u.profile?.isOnline,
      coinsPerMinute: u.profile?.coinsPerMinute,
    }));
  }
}
