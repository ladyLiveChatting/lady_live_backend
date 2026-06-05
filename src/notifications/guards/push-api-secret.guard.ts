import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class PushApiSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('PUSH_API_SECRET')?.trim();
    if (!expected) {
      throw new UnauthorizedException(
        'PUSH_API_SECRET is not configured on the server.',
      );
    }

    const req = context.switchToHttp().getRequest<Request>();
    const provided =
      (req.headers['x-push-api-secret'] as string | undefined)?.trim() ||
      (req.query['secret'] as string | undefined)?.trim();

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid or missing push API secret.');
    }

    return true;
  }
}
