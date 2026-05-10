'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { ensureDatabaseUrl, onRailway } = require('./ensure-database-url.cjs');
ensureDatabaseUrl();

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    [
      '[db] DATABASE_URL is not set and could not be built from env.',
      onRailway()
        ? [
            'On Railway:',
            '  • Add MySQL (New → Database → MySQL).',
            '  • On this API service → Variables → add either:',
            '      – DATABASE_URL = reference → MySQL → MYSQL_URL or MYSQL_PRIVATE_URL, or',
            '      – references for MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT.',
            'Docs: https://docs.railway.com/databases/mysql',
          ].join('\n')
        : 'Locally: set DATABASE_URL in backend/.env or export it before deploy.',
    ].join('\n'),
  );
  process.exit(1);
}

const prismaCli = path.join(__dirname, '..', 'node_modules', '.bin', 'prisma');
const result = spawnSync(prismaCli, ['db', 'push'], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: process.env,
});
process.exit(result.status === null ? 1 : result.status);
