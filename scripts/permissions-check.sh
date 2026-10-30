#!/usr/bin/env bash
# The server-side permission probe, run from the deployed checkout (so it
# always probes with the manifest the host runs):
#
#   deploy  after each deploy, from cd-qa.yml and cd-prod.yml:
#             bash ./scripts/permissions-check.sh deploy <public base URL>
#           Fails the deploy on any failure, and with `permission cron stale`
#           when the cron has not run for 48 h.
#   cron    daily, as one crontab line per server, e.g. on QA:
#             17 5 * * * $HOME/<APP_DIR>/scripts/permissions-check.sh cron https://zoonotify-dev.bfr.berlin/cms/api >> $HOME/permissions-cron.log 2>&1
#           Mails PERMISSIONS_PROBE_MAIL_TO whenever the failure set changed
#           since the last saved report.
#
# Prints only fixed pass/FAIL lines; the full report goes to
# ~/permission-reports/. Logic: scripts/permissions/server-run.mjs.

# Never trace: the env file holds the reader token, and the deploy log is
# public. Runs before anything else so even `bash -x` stops here.
{ set +x; } 2>/dev/null
set -euo pipefail

USAGE="usage: permissions-check.sh <deploy|cron> <baseUrl>"
MODE="${1:-}"
case "$MODE" in
  deploy | cron) ;;
  *)
    echo "$USAGE"
    exit 2
    ;;
esac
BASE_URL="${2:?$USAGE}"

ENV_FILE="$HOME/permissions-probe.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "permission probe: FAIL, $ENV_FILE not found"
  exit 1
fi

cd "$(dirname "$0")/.."

# cron's shell and a manual run may have no nvm loaded or another Node: select
# the checkout's .nvmrc Node, as deploy.sh does (a no-op when it already is).
# nvm is not errexit/nounset-safe, so relax both around it.
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

exec node scripts/permissions/server-run.mjs "$MODE" "$BASE_URL"
