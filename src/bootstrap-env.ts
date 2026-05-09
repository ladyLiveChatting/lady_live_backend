import { config } from 'dotenv';
import { join } from 'path';

/** Run before any module imports Prisma so `DATABASE_URL` exists for schema.prisma. */
config({ path: join(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
  const host = process.env.DB_HOST ?? '127.0.0.1';
  const port = process.env.DB_PORT ?? '3306';
  const user = process.env.DB_USERNAME ?? 'root';
  const password = process.env.DB_PASSWORD ?? '';
  const database =
    process.env.DB_DATABASE ?? process.env.DB_NAME ?? 'meet_connect';
  const u = encodeURIComponent(user);
  const p = encodeURIComponent(password);
  process.env.DATABASE_URL = `mysql://${u}:${p}@${host}:${port}/${database}`;
}
