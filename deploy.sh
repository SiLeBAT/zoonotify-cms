#!/usr/bin/env bash
set -euo pipefail

PATH=$PATH:~/bin
source ~/.bashrc
source ~/.nvm/nvm.sh

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
./node_modules/.bin/pm2 stop all
killall node || true
./node_modules/.bin/pm2 start "$(dirname "$0")/ecosystem.config.js"
