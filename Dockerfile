# Build + run the Zoonotify CMS for the Import CLI integration test (and as a
# reusable QA image). Single-stage: Strapi's admin build is produced at image
# build time, then `yarn start` serves it. Secrets come from the environment.
FROM node:20-bookworm

# Native build tools for any transitive native deps (e.g. better-sqlite3, sharp).
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app

# Install ALL dependencies (incl. dev) so the Strapi admin build has its tooling.
# --production=false guards against yarn classic skipping devDeps if NODE_ENV leaks in.
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false --network-timeout 600000 --ignore-engines

# App sources + admin build.
COPY . .
RUN yarn build

# Production only at runtime, after the build has its dev tooling.
ENV NODE_ENV=production
EXPOSE 1337
CMD ["yarn", "start"]
