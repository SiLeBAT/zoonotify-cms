#!/usr/bin/env bash
# Post-deploy permission probe, called by cd-qa.yml and cd-prod.yml from the
# just-deployed checkout once the new build answers:
#
#   bash ./scripts/permissions-deploy-check.sh <public base URL>
#
# Prints only `permission probe: pass` / `permission probe: FAIL, report
# mailed` (plus `permission cron stale`) and exits non-zero on any of them
# failing, which fails the deploy. The full report goes to
# ~/permission-reports/. Logic: scripts/permissions/server-run.mjs.

# Never trace: the env file holds the reader token, and the deploy log is
# public. Runs before anything else so even `bash -x` stops here.
{ set +x; } 2>/dev/null
set -euo pipefail

ENV_FILE="$HOME/permissions-probe.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "permission probe: FAIL, $ENV_FILE not found"
  exit 1
fi
set -a
. "$ENV_FILE"
set +a

cd "$(dirname "$0")/.."
exec node scripts/permissions/server-run.mjs deploy "${1:?usage: permissions-deploy-check.sh <baseUrl>}"
