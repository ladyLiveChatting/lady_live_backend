'use strict';

function onRailway() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_ENVIRONMENT_ID ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID,
  );
}

/**
 * Sets process.env.DATABASE_URL when missing:
 * 1) MYSQL_URL / MYSQL_PRIVATE_URL (Railway MySQL)
 * 2) MYSQLHOST + MYSQLUSER + … (Railway split vars)
 * 3) DB_HOST + DB_USERNAME + … (custom / Docker)
 * 4) Local only: defaults to 127.0.0.1 (never fake this on Railway)
 */
function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return;

  const mysqlUrl =
    process.env.MYSQL_URL?.trim() ||
    process.env.MYSQL_PRIVATE_URL?.trim();
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

  if (process.env.DB_HOST && process.env.DB_USERNAME != null) {
    const port = process.env.DB_PORT ?? '3306';
    const user = String(process.env.DB_USERNAME);
    const password = process.env.DB_PASSWORD ?? '';
    const database =
      process.env.DB_DATABASE ?? process.env.DB_NAME ?? 'meet_connect';
    process.env.DATABASE_URL = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(
      password,
    )}@${process.env.DB_HOST}:${port}/${database}`;
    return;
  }

  if (onRailway()) {
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

module.exports = { ensureDatabaseUrl, onRailway };
