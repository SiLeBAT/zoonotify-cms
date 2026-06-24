#!/usr/bin/env bash
set -euo pipefail

# Export the current Strapi content/config to a timestamped tarball in a sibling
# `../backup/` directory, then keep only the 5 most recent backups.
# Run from inside the app directory (where node_modules and .env live).

mkdir -p ../backup

yarn run strapi export --no-encrypt -f "../backup/cms-$(date -d "today" +"%Y%m%d%H%M")"

cd ../backup/

# Prune all but the 5 newest backups. `xargs -r` is a no-op when there is
# nothing to delete (i.e. 5 or fewer backups exist), avoiding a bare `rm`.
ls -td -- *.tar.gz 2>/dev/null | awk 'NR>5' | xargs -r rm -f --
