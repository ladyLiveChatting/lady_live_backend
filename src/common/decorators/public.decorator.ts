import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Skip JWT for this route (use with JwtAuthGuard). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
