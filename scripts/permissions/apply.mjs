// @ts-check
// Writes the permission manifest's Public and Authenticated grants, and
// sign-ups off, into a LOCAL database. The CLI (apply-cli.mjs) refuses any
// other target; this module only computes and applies the change through a
// store, so it never knows which database it writes.

import { publicActionUids } from './manifest.mjs';

/**
 * @typedef {'public' | 'authenticated'} RoleType
 * @typedef {{
 *   grants: (role: RoleType) => Promise<string[]>,
 *   grant: (role: RoleType, actions: string[]) => Promise<void>,
 *   revoke: (role: RoleType, actions: string[]) => Promise<void>,
 *   signUps: () => Promise<boolean>,
 *   setSignUps: (on: boolean) => Promise<void>,
 * }} PermissionStore
 * @typedef {{ added: string[], removed: string[] }} RoleChange
 */

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Why `apply` must not write to the database `env` points at, or null when it
 * is local: NODE_ENV explicitly `development` (a deployed host runs
 * `production`, and a shell there may have it unset) and a database that is
 * SQLite or on a loopback host. Mirrors config/database.ts's defaults.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {string | null}
 */
export function refusalToApply(env) {
  if (env.NODE_ENV !== 'development') {
    const now = env.NODE_ENV === undefined ? 'NODE_ENV is not set' : `NODE_ENV is "${env.NODE_ENV}"`;
    return `${now}; permissions:apply only writes a local development database. Set NODE_ENV=development to run it.`;
  }
  const client = env.DATABASE_CLIENT ?? 'sqlite';
  if (client === 'sqlite') return null;
  if (!['postgres', 'mysql', 'mysql2'].includes(client)) {
    return `DATABASE_CLIENT is "${client}"; permissions:apply cannot tell whether it is local.`;
  }
  const hosts = [env.DATABASE_HOST ?? 'localhost'];
  if (env.DATABASE_URL) hosts.push(hostOf(env.DATABASE_URL));
  const remote = hosts.find((host) => !LOOPBACK.has(host));
  return remote === undefined
    ? null
    : `The database host is "${remote}"; permissions:apply only writes a database on this machine (localhost, 127.0.0.1).`;
}

/** The host of a connection URL, never its credentials. */
const hostOf = (url) => {
  try {
    return new URL(url).hostname || '(none)';
  } catch {
    return '(unparseable DATABASE_URL)';
  }
};

/**
 * Sets each role's grants to exactly the manifest's set and turns sign-ups off.
 *
 * @param {{ manifest: any, surface: import('./manifest.mjs').Surface, store: PermissionStore }} options
 * @returns {Promise<{ public: RoleChange, authenticated: RoleChange, signUpsTurnedOff: boolean }>}
 */
export async function applyManifest({ manifest, surface, store }) {
  const wanted = {
    public: publicActionUids(manifest, surface),
    authenticated: [...manifest.authenticated.actions].sort(),
  };

  /** @param {RoleType} role */
  const reconcile = async (role) => {
    const current = new Set(await store.grants(role));
    const target = new Set(wanted[role]);
    const added = wanted[role].filter((a) => !current.has(a));
    const removed = [...current].filter((a) => !target.has(a)).sort();
    if (added.length) await store.grant(role, added);
    if (removed.length) await store.revoke(role, removed);
    return { added, removed };
  };

  const changes = { public: await reconcile('public'), authenticated: await reconcile('authenticated') };
  const signUpsTurnedOff = (await store.signUps()) !== manifest.signUps;
  if (signUpsTurnedOff) await store.setSignUps(manifest.signUps);
  return { ...changes, signUpsTurnedOff };
}
