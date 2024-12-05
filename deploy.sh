#!/usr/bin/env bash
    nvm use 18.20.5
    /usr/home/zoono/.yarn/bin/yarn
    /usr/home/zoono/.yarn/bin/yarn build
    ./node_modules/.bin/pm2 stop all
    killall node
    ./node_modules/.bin/pm2 start /usr/home/zoono/zoonotify-cms/ecosystem.config.js
