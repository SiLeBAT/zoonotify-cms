const fs = require('fs');
const path = require('path');

// Single source of truth for the Node version: read it from .nvmrc so PM2 runs
// the app under the same version CI builds and the deploy installs.
const nodeVersion = fs.readFileSync(path.join(__dirname, '.nvmrc'), 'utf8').trim();

module.exports = {
    apps: [
      {
        name: 'zoonotify-cms',
        script: 'npm',
        args: 'start',
        interpreter: `node@${nodeVersion}`,
        env: {
            NODE_ENV: "production",
            // Strapi's admin sessions store an absolute expiresAt. With the
            // process on server-local time (CEST) the value round-trips
            // through the DB shifted by the UTC offset; a non-"remember me"
            // session (2h idle lifespan) then reads back as already expired
            // and every login bounces to the login screen.
            TZ: "UTC",
          }
      },
    ],
  };
