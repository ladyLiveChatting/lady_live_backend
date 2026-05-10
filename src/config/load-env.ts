import { existsSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

/** `backend/` root when called from compiled `dist/*.js` (one `..` from `dist`). */
export function loadEnvFromDisk(backendRoot: string): void {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const chain = [
    join(backendRoot, '.env'),
    join(backendRoot, `.env.${nodeEnv}`),
    join(backendRoot, '.env.local'),
    join(backendRoot, `.env.${nodeEnv}.local`),
  ];
  for (const p of chain) {
    if (existsSync(p)) config({ path: p, override: true });
  }
}

/**
 * Paths for Nest `ConfigModule` — first entry wins for a key (highest priority first).
 * @see https://docs.nestjs.com/techniques/configuration
 */
export function nestConfigEnvFilePaths(backendRoot: string): string[] {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const paths = [
    join(backendRoot, `.env.${nodeEnv}.local`),
    join(backendRoot, '.env.local'),
    join(backendRoot, `.env.${nodeEnv}`),
    join(backendRoot, '.env'),
  ];
  return paths.filter((p) => existsSync(p));
}
