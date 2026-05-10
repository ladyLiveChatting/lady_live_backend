'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function onRailway() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_ENVIRONMENT_ID ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID,
  );
}

/** True if user configured DB before we synthesize DATABASE_URL from local defaults. */
function hasExplicitDbConfig() {
  return (
    Boolean(process.env.DATABASE_URL?.trim()) ||
    Boolean(process.env.MYSQL_URL?.trim()) ||
    (Boolean(process.env.MYSQLHOST) && process.env.MYSQLUSER != null) ||
    (Boolean(process.env.DB_HOST) && process.env.DB_USERNAME != null)
  );
}

if (onRailway() && !hasExplicitDbConfig()) {
  console.error(
    [
      '[railway] No database configuration on this service.',
      'Do one of the following:',
      '  1) Project → New → Database → MySQL, then open this API service → Variables →',
      '     add references from the MySQL service (MYSQL_URL or MYSQLHOST + MYSQLUSER + MYSQLPASSWORD + MYSQLDATABASE + MYSQLPORT).',
      '  2) Or set DATABASE_URL on this service manually.',
      'Docs: https://docs.railway.com/databases/mysql',
    ].join('\n'),
  );
  process.exit(1);
}

const { ensureDatabaseUrl } = require('./ensure-database-url.cjs');
ensureDatabaseUrl();

const prismaCli = path.join(__dirname, '..', 'node_modules', '.bin', 'prisma');
const result = spawnSync(prismaCli, ['db', 'push'], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: process.env,
});
process.exit(result.status === null ? 1 : result.status);
