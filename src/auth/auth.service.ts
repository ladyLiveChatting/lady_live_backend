import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, UserRole } from '../prisma-client';
import { RegisterGirlDto } from './dto/register-girl.dto';
import { LoginDto } from './dto/login.dto';
import { GuestDto } from './dto/guest.dto';
import { RegisterBoyDto } from './dto/register-boy.dto';
import { BoyPhoneDto } from './dto/boy-phone.dto';
import { GirlPhoneDto } from './dto/girl-phone.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private accessSecret() {
    return this.config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me';
  }

  private refreshSecret() {
    return (
      this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-change-me'
    );
  }

  private async signAccess(userId: string, role: UserRole) {
    return this.jwt.signAsync(
      { sub: userId, role },
      { secret: this.accessSecret(), expiresIn: '15m' },
    );
  }

  private async signRefresh(userId: string) {
    return this.jwt.signAsync(
      { sub: userId, typ: 'refresh' },
      { secret: this.refreshSecret(), expiresIn: '7d' },
    );
  }

  private async persistRefresh(userId: string, rawRefresh: string) {
    const tokenHash = bcrypt.hashSync(rawRefresh, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  async registerGirl(dto: RegisterGirlDto) {
    const exists = await this.prisma.user.findFirst({
      where: { phone: dto.phone },
    });
    if (exists) throw new ConflictException('Phone already registered');
    const passwordHash = bcrypt.hashSync(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        passwordHash,
        role: UserRole.GIRL,
        profile: {
          create: {
            displayName: dto.displayName,
            age: dto.age,
            country: dto.country,
            imageUrl: dto.imageUrl,
            coinsPerMinute: 120,
            isOnline: false,
          },
        },
      },
    });
    const access = await this.signAccess(user.id, user.role);
    const refresh = await this.signRefresh(user.id);
    await this.persistRefresh(user.id, refresh);
    return { accessToken: access, refreshToken: refresh, userId: user.id };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { phone: dto.phone },
      include: { profile: true },
    });
    if (!user?.passwordHash) throw new UnauthorizedException();
    const ok = bcrypt.compareSync(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException();
    const access = await this.signAccess(user.id, user.role);
    const refresh = await this.signRefresh(user.id);
    await this.persistRefresh(user.id, refresh);
    return { accessToken: access, refreshToken: refresh, userId: user.id };
  }

  async guest(dto: GuestDto) {
    const name = dto.displayName?.trim() || `Guest ${uuidv4().slice(0, 6)}`;
    const user = await this.prisma.user.create({
      data: {
        role: UserRole.GUEST,
        isGuest: true,
        profile: {
          create: {
            displayName: name,
            coinsPerMinute: 0,
            isOnline: true,
            lastSeenAt: new Date(),
          },
        },
        wallet: { create: { balance: 500 } },
      },
    });
    const access = await this.signAccess(user.id, user.role);
    const refresh = await this.signRefresh(user.id);
    await this.persistRefresh(user.id, refresh);
    return { accessToken: access, refreshToken: refresh, userId: user.id };
  }

  async refresh(rawRefresh: string) {
    let payload: { sub: string; typ?: string };
    try {
      payload = await this.jwt.verifyAsync(rawRefresh, {
        secret: this.refreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh');
    }
    if (payload.typ !== 'refresh') throw new UnauthorizedException();
    const rows = await this.prisma.refreshToken.findMany({
      where: { userId: payload.sub, expiresAt: { gt: new Date() } },
    });
    let matched = false;
    for (const row of rows) {
      if (bcrypt.compareSync(rawRefresh, row.tokenHash)) {
        matched = true;
        break;
      }
    }
    if (!matched) throw new UnauthorizedException();
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.sub },
    });
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    const access = await this.signAccess(user.id, user.role);
    const nextRefresh = await this.signRefresh(user.id);
    await this.persistRefresh(user.id, nextRefresh);
    return {
      accessToken: access,
      refreshToken: nextRefresh,
      userId: user.id,
    };
  }

  async registerBoy(dto: RegisterBoyDto) {
    const exists = await this.prisma.user.findFirst({
      where: { phone: dto.phone },
    });
    if (exists) throw new ConflictException('Phone already registered');
    const passwordHash = bcrypt.hashSync(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        passwordHash,
        role: UserRole.BOY,
        profile: {
          create: {
            displayName: dto.displayName,
            age: dto.age,
            country: dto.country,
            coinsPerMinute: 0,
            isOnline: false,
          },
        },
        wallet: { create: { balance: 200 } },
      },
    });
    const access = await this.signAccess(user.id, user.role);
    const refresh = await this.signRefresh(user.id);
    await this.persistRefresh(user.id, refresh);
    return { accessToken: access, refreshToken: refresh, userId: user.id };
  }

  /**
   * Boys quick login by phone (no signup/password UX).
   * - If a BOY exists for this phone: issues new tokens.
   * - Else: creates BOY + wallet + profile, then issues tokens.
   */
  async boyQuickPhone(dto: BoyPhoneDto) {
    const phone = dto.phone.trim();
    const existing = await this.prisma.user.findFirst({
      where: { phone, role: UserRole.BOY },
    });

    const user =
      existing ??
      (await this.prisma.user.create({
        data: {
          phone,
          role: UserRole.BOY,
          profile: {
            create: {
              displayName: dto.displayName?.trim() || `Boy ${uuidv4().slice(0, 6)}`,
              coinsPerMinute: 0,
              isOnline: false,
            },
          },
          wallet: { create: { balance: 200 } },
        },
      }));

    const access = await this.signAccess(user.id, user.role);
    const refresh = await this.signRefresh(user.id);
    await this.persistRefresh(user.id, refresh);
    return { accessToken: access, refreshToken: refresh, userId: user.id };
  }

  /**
   * Girls quick login by phone (no password UX for legacy app).
   * - If a GIRL exists for this phone: issues new tokens.
   * - Else: creates GIRL + profile, then issues tokens.
   */
  async girlQuickPhone(dto: GirlPhoneDto) {
    const phone = dto.phone.trim();
    const existing = await this.prisma.user.findFirst({
      where: { phone, role: UserRole.GIRL },
    });

    const user =
      existing ??
      (await this.prisma.user.create({
        data: {
          phone,
          role: UserRole.GIRL,
          profile: {
            create: {
              displayName:
                dto.displayName?.trim() || `Girl ${uuidv4().slice(0, 6)}`,
              age: dto.age,
              country: dto.country,
              imageUrl: dto.imageUrl,
              coinsPerMinute: 120,
              isOnline: false,
            },
          },
        },
      }));

    const access = await this.signAccess(user.id, user.role);
    const refresh = await this.signRefresh(user.id);
    await this.persistRefresh(user.id, refresh);
    return { accessToken: access, refreshToken: refresh, userId: user.id };
  }
}
