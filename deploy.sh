#!/usr/bin/env bash
set -euo pipefail

PATH=$PATH:~/bin
source ~/.bashrc
# --no-use: a plain source switches to nvm's `default` alias, silently undoing
# whatever version the caller selected. Pick the version from .nvmrc instead.
# nvm is not errexit/nounset-safe, so relax both around it and check the result.
set +eu
source ~/.nvm/nvm.sh --no-use
nvm install
nvm use
nvm_status=$?
set -eu
if [ "$nvm_status" -ne 0 ] || [ "$(node --version)" != "v$(cat .nvmrc)" ]; then
  echo "ERROR: expected Node v$(cat .nvmrc), got $(node --version 2>&1)" >&2
  exit 1
fi

# Ensure persistent uploads symlink (idempotent)
mkdir -p "$HOME/strapi-uploads"
if [ -d public/uploads ] && [ ! -L public/uploads ]; then
  cp -a public/uploads/. "$HOME/strapi-uploads/" 2>/dev/null || true
  rm -rf public/uploads
fi
ln -sfn "$HOME/strapi-uploads" public/uploads

if [ ! -d data/master-data ]; then
  mkdir -p data/master-data
fi

"$HOME/.yarn/bin/yarn" install --frozen-lockfile
"$HOME/.yarn/bin/yarn" build
# delete, not stop: the PM2 daemon survives `killall node` (its process title
# is "PM2 vX: God Daemon"), and `pm2 start` on a merely stopped app restarts it
# with the env cached at first registration, silently ignoring changes to the
# ecosystem file's `env` block.
./node_modules/.bin/pm2 delete all || true
killall node || true
./node_modules/.bin/pm2 start "$(dirname "$0")/ecosystem.config.js"
