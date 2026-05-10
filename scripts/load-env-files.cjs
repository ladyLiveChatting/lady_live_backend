'use strict';

const fs = require('fs');
const path = require('path');

/** Same file order as `src/config/load-env.ts` (later files override). */
function loadEnvFromDisk(backendRoot) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const chain = [
    path.join(backendRoot, '.env'),
    path.join(backendRoot, `.env.${nodeEnv}`),
    path.join(backendRoot, '.env.local'),
    path.join(backendRoot, `.env.${nodeEnv}.local`),
  ];
  for (const p of chain) {
    if (fs.existsSync(p)) {
      require('dotenv').config({ path: p, override: true });
    }
  }
}

module.exports = { loadEnvFromDisk };
