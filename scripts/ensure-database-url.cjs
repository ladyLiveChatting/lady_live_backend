'use strict';

/**
 * Sets process.env.DATABASE_URL when missing:
 * 1) Railway MySQL: MYSQL_URL or MYSQLHOST + MYSQLUSER + …
 * 2) Local / docker-compose: DB_HOST / DB_USERNAME / … (defaults)
 */
function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return;

  const mysqlUrl = process.env.MYSQL_URL?.trim();
  if (mysqlUrl) {
    process.env.DATABASE_URL = mysqlUrl;
    return;
  }

  if (process.env.MYSQLHOST && process.env.MYSQLUSER != null) {
    const port = process.env.MYSQLPORT ?? '3306';
    const user = String(process.env.MYSQLUSER);
    const password = process.env.MYSQLPASSWORD ?? '';
    const database = process.env.MYSQLDATABASE ?? 'railway';
    process.env.DATABASE_URL = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(
      password,
    )}@${process.env.MYSQLHOST}:${port}/${database}`;
    return;
  }

  const host = process.env.DB_HOST ?? '127.0.0.1';
  const port = process.env.DB_PORT ?? '3306';
  const user = process.env.DB_USERNAME ?? 'root';
  const password = process.env.DB_PASSWORD ?? '';
  const database =
    process.env.DB_DATABASE ?? process.env.DB_NAME ?? 'meet_connect';
  process.env.DATABASE_URL = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(
    password,
  )}@${host}:${port}/${database}`;
}

module.exports = { ensureDatabaseUrl };
