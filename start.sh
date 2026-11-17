#!/usr/bin/env bash
# Start the CMS under PM2 after a host reboot. Run it from cron:
#
#   @reboot bash $HOME/<APP_DIR>/start.sh >> $HOME/pm2-reboot.log 2>&1
#
# Cron starts with almost no environment. Without NVM_DIR, PM2 cannot resolve
# the `node@<version>` interpreter in ecosystem.config.js and refuses to start
# the app ("Interpreter node@x.y.z is NOT AVAILABLE in PATH"). This script sets
# up nvm with the version from .nvmrc, the same way deploy.sh does.
#
# Boot only: it does not install or build (deploy.sh does). Run by hand on a
# live host it restarts the app, because `pm2 start <ecosystem>` restarts apps
# that are already running.
set -euo pipefail
cd "$(dirname "$0")"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# nvm is not errexit/nounset-safe, so relax both around it and check the result.
set +eu
source "$NVM_DIR/nvm.sh" --no-use
nvm use
nvm_status=$?
set -eu
if [ "$nvm_status" -ne 0 ] || [ "$(node --version)" != "v$(cat .nvmrc)" ]; then
  echo "ERROR: expected Node v$(cat .nvmrc), got $(node --version 2>&1)" >&2
  exit 1
fi

echo "==> $(date -u +%FT%TZ) starting zoonotify-cms under PM2"
./node_modules/.bin/pm2 start ecosystem.config.js
