import { config } from 'dotenv';
import { join } from 'path';

/** Run before any module imports Prisma so `DATABASE_URL` exists for schema.prisma. */
config({ path: join(__dirname, '..', '.env') });

// Railway MySQL exposes MYSQL_URL / MYSQLHOST+…; local uses DB_* (see scripts/ensure-database-url.cjs).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ensureDatabaseUrl } = require(join(
  __dirname,
  '..',
  'scripts',
  'ensure-database-url.cjs',
)) as { ensureDatabaseUrl: () => void };
ensureDatabaseUrl();
