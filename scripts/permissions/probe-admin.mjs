// @ts-check
// The admin half of the permission probe: exact sets read through the admin
// API with the `permissions-reader` token. Rules: issues 083 (token
// inventory, exact sets) and 087 (Authenticated, role inventory, sign-ups).
// Something present that the manifest doesn't list is a leak; something listed
// that is missing is drift. Paths are relative to the server root, from
// Strapi 5.59's admin and users-permissions admin route files.

import { publicActionUids } from './manifest.mjs';
import { describeAnswer } from './probe-anonymous.mjs';

/**
 * @typedef {import('./probe.mjs').Failure} Failure
 * @typedef {import('./probe.mjs').Http} Http
 */

const ROLES = '/users-permissions/roles';

/** @returns {Failure} */
const row = (category, target, action, expected, got, consumers = []) => ({
  category,
  target,
  action,
  locale: null,
  expected,
  got,
  consumers,
});

/**
 * GETs an admin path and returns its body, or the error row when it did not
 * answer 200 with a body (`target` names what could not be read).
 *
 * @param {Http} admin
 * @param {string} path
 * @param {string} target
 * @returns {Promise<{ body: any } | { failure: Failure }>}
 */
async function read(admin, path, target) {
  const a = await admin.request('GET', path);
  if (a.status === 200 && a.body) return { body: a.body };
  return { failure: row('error', target, `GET ${path}`, '200 (read with the permissions-reader token)', describeAnswer(a)) };
}

/** `{ extra, missing }` between an actual and an expected list. */
function compare(actual, expected) {
  const want = new Set(expected);
  const have = new Set(actual);
  return { extra: [...have].filter((x) => !want.has(x)).sort(), missing: [...want].filter((x) => !have.has(x)).sort() };
}

/**
 * Role inventory: exactly the manifest's roles, by name.
 *
 * @param {Http} admin
 * @param {any} manifest
 * @returns {Promise<Failure[]>}
 */
async function checkRoles(admin, manifest) {
  const target = 'users-permissions roles';
  const r = await read(admin, ROLES, target);
  if ('failure' in r) return [r.failure];
  const roles = r.body.roles ?? [];
  const { extra, missing } = compare(
    roles.map((role) => role.name),
    manifest.roles,
  );
  return [
    ...extra.map((name) => {
      const role = roles.find((x) => x.name === name);
      return row('leak', target, name, 'no such role', `role (type ${role.type})`);
    }),
    ...missing.map((name) => row('drift', target, name, 'role', 'no such role')),
  ];
}

/**
 * The enabled action uids in a `GET /users-permissions/roles/:id` permission
 * map (`{ <type>: { controllers: { <controller>: { <action>: { enabled } } } } }`).
 *
 * @returns {string[]}
 */
const enabledUids = (permissions) =>
  Object.entries(permissions ?? {}).flatMap(([type, { controllers = {} } = {}]) =>
    Object.entries(controllers).flatMap(([controller, actions]) =>
      Object.entries(actions ?? {})
        .filter(([, a]) => a?.enabled)
        .map(([action]) => `${type}.${controller}.${action}`),
    ),
  );

/**
 * The consumers of the manifest entry an action uid belongs to, for the report.
 *
 * @param {any} manifest
 * @param {import('./manifest.mjs').Surface} surface
 */
function consumersOf(manifest, surface) {
  const byUid = new Map(surface.contentTypes.map((ct) => [ct.uid, manifest.public.contentTypes[ct.pluralName]]));
  return (/** @type {string} */ uid) => {
    const plugin = uid.match(/^plugin::([^.]+)\./);
    const entry = plugin
      ? manifest.public.plugins[plugin[1]]
      : (manifest.public.customRoutes[uid] ?? byUid.get(uid.slice(0, uid.lastIndexOf('.'))));
    return entry?.consumers ?? [];
  };
}

/**
 * One role's exact grant set. The role is found by its `type`; when it is
 * missing the role inventory check reports it, so this one stays silent.
 *
 * @param {Http} admin
 * @param {{ type: string, name: string, expected: string[], consumers: (uid: string) => string[] }} role
 * @returns {Promise<Failure[]>}
 */
async function checkGrants(admin, { type, name, expected, consumers }) {
  const target = `${name} role`;
  const list = await read(admin, ROLES, target);
  if ('failure' in list) return [list.failure];
  const id = (list.body.roles ?? []).find((r) => r.type === type)?.id;
  if (id === undefined) return [];
  const one = await read(admin, `${ROLES}/${id}`, target);
  if ('failure' in one) return [one.failure];
  const { extra, missing } = compare(enabledUids(one.body.role?.permissions), expected);
  return [
    ...extra.map((uid) => row('leak', target, uid, 'not granted', 'granted', consumers(uid))),
    ...missing.map((uid) => row('drift', target, uid, 'granted', 'not granted', consumers(uid))),
  ];
}

/**
 * The users-permissions "Enable sign-ups" setting. On when the manifest says
 * off is a leak (anyone could get the Authenticated role); the reverse drift.
 *
 * @param {Http} admin
 * @param {any} manifest
 * @returns {Promise<Failure[]>}
 */
async function checkSignUps(admin, manifest) {
  const target = 'users-permissions advanced settings';
  const r = await read(admin, '/users-permissions/advanced', target);
  if ('failure' in r) return [r.failure];
  const on = r.body.settings?.allow_register === true;
  if (on === manifest.signUps) return [];
  const word = (b) => (b ? 'on' : 'off');
  return [row(on ? 'leak' : 'drift', target, 'allow_register', word(manifest.signUps), word(on))];
}

/**
 * The content-API token inventory: exactly the manifest's Import token, with
 * exactly its actions. `GET /admin/api-tokens` lists content-API tokens only;
 * admin tokens (the reader's own among them) are outside the guarded surface.
 *
 * @param {Http} admin
 * @param {any} manifest
 * @returns {Promise<Failure[]>}
 */
async function checkApiTokens(admin, manifest) {
  const want = manifest.importToken;
  const r = await read(admin, '/admin/api-tokens', 'API tokens');
  if ('failure' in r) return [r.failure];
  const tokens = (r.body.data ?? []).filter((t) => t.kind !== 'admin');
  const target = (t) => `API token ${t.name}`;

  /** @type {Failure[]} */
  const rows = [];
  const mine = tokens.find((t) => t.name === want.name);
  for (const t of tokens) {
    if (t !== mine) rows.push(row('leak', target(t), '', 'no such token', `${t.type} token`));
  }
  if (!mine) return [...rows, row('drift', target(want), '', `${want.type} token`, 'no such token')];
  // read-only and full-access tokens carry no action list: their type is the leak.
  if (mine.type !== want.type) return [...rows, row('leak', target(mine), 'type', want.type, mine.type)];
  const { extra, missing } = compare(mine.permissions ?? [], want.actions);
  return [
    ...rows,
    ...extra.map((uid) => row('leak', target(mine), uid, 'not granted', 'granted')),
    ...missing.map((uid) => row('drift', target(mine), uid, 'granted', 'not granted')),
  ];
}

/**
 * @param {{ manifest: any, surface: import('./manifest.mjs').Surface, admin: Http }} options
 * @returns {import('./probe.mjs').Check[]}
 */
export function adminChecks({ manifest, surface, admin }) {
  const consumers = consumersOf(manifest, surface);
  const publicSet = publicActionUids(manifest, surface);
  return [
    { id: 'admin: roles', run: () => checkRoles(admin, manifest) },
    { id: 'admin: Public grants', run: () => checkGrants(admin, { type: 'public', name: 'Public', expected: publicSet, consumers }) },
    {
      id: 'admin: Authenticated grants',
      run: () =>
        checkGrants(admin, { type: 'authenticated', name: 'Authenticated', expected: manifest.authenticated.actions, consumers: () => [] }),
    },
    { id: 'admin: sign-ups', run: () => checkSignUps(admin, manifest) },
    { id: 'admin: API tokens', run: () => checkApiTokens(admin, manifest) },
  ];
}
