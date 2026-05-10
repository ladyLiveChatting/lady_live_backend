const path = require('path');
const { loadEnvFromDisk } = require('./load-env-files.cjs');
loadEnvFromDisk(path.join(__dirname, '..'));
const { ensureDatabaseUrl } = require('./ensure-database-url.cjs');
ensureDatabaseUrl();
