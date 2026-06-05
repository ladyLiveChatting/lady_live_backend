import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, UserRole } from '../prisma-client';

export type AccessPayload = { sub: string; role: string; sid?: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaClient,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me',
    });
  }

  async validate(payload: AccessPayload) {
    const u = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!u) throw new UnauthorizedException();
    if (u.role === UserRole.BOY || u.role === UserRole.GUEST) {
      if (u.activeSessionId) {
        if (payload.sid !== u.activeSessionId) {
          throw new UnauthorizedException('Logged in on another device');
        }
      }
    }
    return { userId: u.id, role: u.role };
  }
}
