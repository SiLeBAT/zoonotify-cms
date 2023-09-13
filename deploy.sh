i#! /bin/bash

UP_TO_DATE=0

[ $(git rev-parse HEAD) = $(git ls-remote $(git rev-parse --abbrev-ref @{u} | \
sed 's/\// /g') | cut -f1) ] && UP_TO_DATE=0 || UP_TO_DATE=1


if [ $UP_TO_DATE = 1 ]; then
    git pull
    npm run build
    ./node_modules/.bin/pm2 restart 0
else
fi
