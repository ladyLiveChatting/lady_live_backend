const { spawnSync } = require('child_process');

require('./prisma-env.cjs');

const host = process.env.DB_HOST ?? '127.0.0.1';
const port = String(process.env.DB_PORT ?? '3306');
const user = process.env.DB_USERNAME ?? 'root';
const password = process.env.DB_PASSWORD ?? '';
const database =
  process.env.DB_DATABASE ?? process.env.DB_NAME ?? 'meet_connect';

if (!/^[a-zA-Z0-9_]+$/.test(database)) {
  console.error('db:create: invalid DB_DATABASE name');
  process.exit(1);
}

const sql = `CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`;

process.env.MYSQL_PWD = password;
const r = spawnSync(
  'mysql',
  ['-h', host, '-P', port, '-u', user, '-e', sql],
  { stdio: 'inherit', encoding: 'utf8' },
);
delete process.env.MYSQL_PWD;

if (r.error && r.error.code === 'ENOENT') {
  console.error(
    'db:create: `mysql` CLI not found. Install MySQL client or run:\n' +
      `  mysql -h ${host} -P ${port} -u ${user} -p -e "CREATE DATABASE IF NOT EXISTS \\\`${database}\\\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`,
  );
  process.exit(1);
}
process.exit(r.status === null ? 1 : r.status);
