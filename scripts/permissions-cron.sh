#!/usr/bin/env bash
# Daily permission drift check. Installed by hand, once per server, as one
# crontab line pointing into the deployed checkout (so it always probes with
# the manifest the host runs), e.g. on QA:
#
#   17 5 * * * $HOME/<APP_DIR>/scripts/permissions-cron.sh https://zoonotify-dev.bfr.berlin/cms/api >> $HOME/permissions-cron.log 2>&1
#
# Saves the report to ~/permission-reports/ and mails PERMISSIONS_PROBE_MAIL_TO
# only when the failure set gained a row since the last saved report. The
# post-deploy check fails with `permission cron stale` when this has not run
# for 48 h. Logic: scripts/permissions/server-run.mjs.

# Never trace: the env file holds the reader token.
{ set +x; } 2>/dev/null
set -euo pipefail

ENV_FILE="$HOME/permissions-probe.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "permission probe: FAIL, $ENV_FILE not found"
  exit 1
fi

cd "$(dirname "$0")/.."

# cron's shell has no nvm: select the checkout's .nvmrc Node, as deploy.sh
# does. nvm is not errexit/nounset-safe, so relax both around it.
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  set +eu
  . "$NVM_DIR/nvm.sh" --no-use
  nvm use > /dev/null
  nvm_status=$?
  set -eu
  if [ "$nvm_status" -ne 0 ]; then
    echo "permission probe: FAIL, could not select Node $(cat .nvmrc) via nvm"
    exit 1
  fi
fi

set -a
. "$ENV_FILE"
set +a

exec node scripts/permissions/server-run.mjs cron "${1:?usage: permissions-cron.sh <baseUrl>}"
