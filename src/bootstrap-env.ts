import { join } from 'path';
import { loadEnvFromDisk } from './config/load-env';

/** Run before any module imports Prisma so `DATABASE_URL` exists for schema.prisma. */
loadEnvFromDisk(join(__dirname, '..'));

// Railway MySQL exposes MYSQL_URL / MYSQLHOST+…; local uses DB_* (see scripts/ensure-database-url.cjs).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ensureDatabaseUrl } = require(join(
  __dirname,
  '..',
  'scripts',
  'ensure-database-url.cjs',
)) as { ensureDatabaseUrl: () => void };
ensureDatabaseUrl();
