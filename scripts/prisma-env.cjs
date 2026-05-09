const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
  const host = process.env.DB_HOST ?? '127.0.0.1';
  const port = process.env.DB_PORT ?? '3306';
  const user = process.env.DB_USERNAME ?? 'root';
  const password = process.env.DB_PASSWORD ?? '';
  const database =
    process.env.DB_DATABASE ?? process.env.DB_NAME ?? 'meet_connect';
  process.env.DATABASE_URL = `mysql://${encodeURIComponent(
    user,
  )}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}
