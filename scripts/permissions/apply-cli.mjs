// @ts-check
// Seeds a LOCAL development database with the permission manifest: Public and
// Authenticated get exactly the manifest's grants, and sign-ups are turned off.
//
//   NODE_ENV=development yarn permissions:apply
//
// Refuses unless NODE_ENV is development and the database is SQLite or on a
// loopback host. Never call this from bootstrap, deploy scripts or CI: grants
// on deployed hosts are edited by hand and only checked by the probe.
//
// Boots Strapi without its HTTP server (compiles src/ to dist/ first), so stop
// a running `yarn develop` on a SQLite database before running it.

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import manifest from '../../config/permissions.mjs';
import { applyManifest, refusalToApply } from './apply.mjs';
import { loadSurface } from './manifest.mjs';

const CMS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * The users-permissions tables of a booted Strapi, as apply's store. Writes
 * rows the way the plugin's own role service does.
 *
 * @param {any} strapi
 * @returns {import('./apply.mjs').PermissionStore}
 */
export function strapiPermissionStore(strapi) {
  const permissions = () => strapi.db.query('plugin::users-permissions.permission');
  const advanced = () => strapi.store({ type: 'plugin', name: 'users-permissions', key: 'advanced' });
  const roleId = async (type) => {
    const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type } });
    if (!role) throw new Error(`users-permissions role "${type}" not found`);
    return role.id;
  };

  return {
    grants: async (type) => {
      const rows = await permissions().findMany({ where: { role: await roleId(type) } });
      return rows.map((row) => row.action).sort();
    },
    grant: async (type, actions) => {
      const role = await roleId(type);
      for (const action of actions) await permissions().create({ data: { action, role } });
    },
    revoke: async (type, actions) => {
      await permissions().deleteMany({ where: { role: await roleId(type), action: { $in: actions } } });
    },
    signUps: async () => (await advanced().get())?.allow_register === true,
    setSignUps: async (on) => {
      const store = advanced();
      await store.set({ value: { ...(await store.get()), allow_register: on } });
    },
  };
}

/** @param {{ added: string[], removed: string[] }} change */
const describe = (role, { added, removed }) => [
  `${role}: ${added.length} added, ${removed.length} removed`,
  ...added.map((a) => `  + ${a}`),
  ...removed.map((a) => `  - ${a}`),
];

async function main() {
  const envFile = join(CMS_ROOT, '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile); // does not override the shell's env

  const refusal = refusalToApply(process.env);
  if (refusal) {
    console.error(`permissions:apply refused: ${refusal}`);
    process.exit(1);
  }

  // The CommonJS build: Strapi's ESM build imports named lodash exports Node rejects.
  const { compileStrapi, createStrapi } = createRequire(import.meta.url)('@strapi/strapi');
  const strapi = await createStrapi(await compileStrapi({ appDir: CMS_ROOT })).load();
  try {
    const result = await applyManifest({ manifest, surface: loadSurface(CMS_ROOT), store: strapiPermissionStore(strapi) });
    console.log(
      [
        ...describe('Public', result.public),
        ...describe('Authenticated', result.authenticated),
        `Sign-ups: ${result.signUpsTurnedOff ? 'turned off' : 'already off'}`,
      ].join('\n'),
    );
  } finally {
    await strapi.destroy();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(
    () => process.exit(0),
    (error) => {
      console.error(error);
      process.exit(1);
    },
  );
}
