const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { ensureDatabaseUrl } = require('./ensure-database-url.cjs');
ensureDatabaseUrl();
