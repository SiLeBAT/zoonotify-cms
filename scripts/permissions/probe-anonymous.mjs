// @ts-check
// The anonymous half of the permission probe: which requests to send for the
// permission manifest, and how to judge each answer. Rules: issue 082 (what the
// probe reports), 077 (deny = 403) and 078 (`?populate=zzprobe`).

import { CORE_ACTIONS, requiredContent } from './manifest.mjs';

/**
 * @typedef {import('./probe.mjs').Answer} Answer
 * @typedef {import('./probe.mjs').Check} Check
 * @typedef {import('./probe.mjs').Failure} Failure
 * @typedef {import('./probe.mjs').Http} Http
 */

/** A documentId no entry has; probes on it never touch real data. */
export const FAKE_ID = 'zzprobe-nonexistent';

const PAGE = '?pagination[pageSize]=1';
const DENIED = '403 ForbiddenError or 401';
const isWrite = (method) => method !== 'GET';

/**
 * Plugin content-API routes probed when the manifest denies the plugin. Each
 * is harmless when granted: empty bodies and fake ids only. Paths from
 * Strapi 5.59's route files.
 */
const PLUGIN_PROBES = {
  'users-permissions': [
    ['auth.register', 'POST', '/auth/local/register'],
    ['auth.callback', 'POST', '/auth/local'],
    ['auth.connect', 'GET', `/connect/${FAKE_ID}`],
    ['auth.forgotPassword', 'POST', '/auth/forgot-password'],
    ['auth.resetPassword', 'POST', '/auth/reset-password'],
    ['auth.emailConfirmation', 'GET', '/auth/email-confirmation'],
    ['auth.sendEmailConfirmation', 'POST', '/auth/send-email-confirmation'],
    ['auth.changePassword', 'POST', '/auth/change-password'],
    ['auth.refresh', 'POST', '/auth/refresh'],
    ['auth.logout', 'POST', '/auth/logout'],
    ['auth.getSessions', 'GET', '/auth/sessions'],
    ['auth.revokeSession', 'DELETE', `/auth/sessions/${FAKE_ID}`],
    ['user.find', 'GET', '/users'],
    ['user.count', 'GET', '/users/count'],
    ['user.me', 'GET', '/users/me'],
    ['user.findOne', 'GET', `/users/${FAKE_ID}`],
    ['user.create', 'POST', '/users'],
    ['user.update', 'PUT', `/users/${FAKE_ID}`],
    ['user.destroy', 'DELETE', `/users/${FAKE_ID}`],
    ['role.find', 'GET', '/users-permissions/roles'],
    ['role.findOne', 'GET', `/users-permissions/roles/${FAKE_ID}`],
    ['role.createRole', 'POST', '/users-permissions/roles'],
    ['role.updateRole', 'PUT', `/users-permissions/roles/${FAKE_ID}`],
    ['role.deleteRole', 'DELETE', `/users-permissions/roles/${FAKE_ID}`],
    ['permissions.getPermissions', 'GET', '/users-permissions/permissions'],
  ],
  upload: [
    ['content-api.upload', 'POST', '/upload'],
    ['content-api.find', 'GET', '/upload/files'],
    ['content-api.findOne', 'GET', `/upload/files/${FAKE_ID}`],
    ['content-api.destroy', 'DELETE', `/upload/files/${FAKE_ID}`],
  ],
};

/** Strapi answers this when register is granted but sign-ups are off. */
const REGISTER_DISABLED = 'Register action is currently disabled';

/** `403 ForbiddenError`, `500 InternalServerError`, `timeout` … */
export const describeAnswer = (/** @type {Answer} */ a) =>
  a.status === null ? a.failure ?? 'no answer' : [a.status, a.name].filter(Boolean).join(' ');

/**
 * Judges a denied action's answer: undefined = passed (refused), else the
 * category. 2xx, a 400 on a write and a 404 on a fake-id write got past the
 * permission layer.
 *
 * @param {Answer} a
 * @param {{ method: string, fakeId: boolean, importAdmin?: boolean }} request
 * @returns {Failure['category'] | undefined}
 */
function judgeDenied(a, { method, fakeId, importAdmin = false }) {
  if (a.status === 401) return undefined;
  if (a.status === 403) {
    if (a.name === 'ForbiddenError') return undefined;
    // is-import-token answers PolicyError only once Public lets the request through.
    if (importAdmin && a.name === 'PolicyError') return 'drift';
    return 'error';
  }
  if (a.status === null) return 'error';
  if (a.status >= 200 && a.status < 300) return 'leak';
  if (a.status === 400 && isWrite(method)) return a.message === REGISTER_DISABLED ? 'drift' : 'leak';
  if (a.status === 404 && fakeId && isWrite(method)) return 'leak';
  return 'error';
}

/**
 * Why a granted read did not answer as expected, from the same path with
 * `?populate=zzprobe`: Strapi validates the query only after the permission
 * check, so 400 = granted (the content is missing), 403 = not granted (drift),
 * 404 = no such route (not deployed).
 *
 * @param {Http} http
 * @param {string} path
 * @returns {Promise<{ category: Failure['category'] | 'granted', got: string }>}
 */
async function classifyRead(http, path) {
  const a = await http.request('GET', `${path}?populate=zzprobe`);
  const got = `?populate=zzprobe: ${describeAnswer(a)}`;
  if (a.status === 400) return { category: 'granted', got };
  if (a.status === 403) return { category: 'drift', got };
  if (a.status === 404) return { category: 'not deployed', got };
  return { category: 'error', got };
}

/**
 * Probes one granted read. Expected status, then classification on anything
 * else; `granted` from the classification means the route is fine but has no
 * content. That fails for required content, and is fine only for a single
 * type with none (`emptyOk`): a collection's find answers 200 even when empty.
 */
async function grantedRead(http, { path, query = '', expected, contentRequired, emptyOk = false }) {
  const a = await http.request('GET', path + query);
  if (a.status === expected) return { ok: true };
  const c = await classifyRead(http, path);
  const got = `${describeAnswer(a)}; ${c.got}`;
  if (c.category !== 'granted') return { ok: false, category: c.category, got };
  // Granted but the expected answer didn't come: missing content where content
  // is required, otherwise something unexpected (a 500, a proxy error …).
  if (contentRequired && a.status === 404) return { ok: false, category: 'missing content', got };
  if (emptyOk && a.status === 404) return { ok: true };
  return { ok: false, category: 'error', got };
}

/**
 * The anonymous checks for a manifest, in manifest order. Grants are probed
 * once without a locale; required single-type content once per locale.
 *
 * @param {{ manifest: any, surface: import('./manifest.mjs').Surface }} options
 * @returns {Check[]}
 */
export function anonymousChecks({ manifest, surface }) {
  /** @type {Check[]} */
  const checks = [];
  const byPlural = new Map(surface.contentTypes.map((ct) => [ct.pluralName, ct]));
  const required = requiredContent(manifest, surface);

  for (const [plural, entry] of Object.entries(manifest.public.contentTypes)) {
    const ct = byPlural.get(plural);
    if (!ct) continue; // coverage.test.mjs reports manifest entries without a type.
    const locales = required.filter((c) => c.pluralName === plural).map((c) => c.locale);
    checks.push({ id: plural, run: (http) => probeType(http, { ct, entry, locales }) });
  }

  for (const [handler, entry] of Object.entries(manifest.public.customRoutes)) {
    if (entry.actions.length) continue; // granted custom routes are listed in notProbed.
    const importAdmin = handler.startsWith('api::import-admin.');
    checks.push(
      deniedCheck(
        handler,
        [entry.method, entry.path, false],
        (category, got) => ({
          category,
          target: `${entry.method} ${entry.path}`,
          action: handler.slice(handler.lastIndexOf('.') + 1),
          locale: null,
          expected: importAdmin ? '403 ForbiddenError' : DENIED,
          got,
          consumers: entry.consumers,
        }),
        importAdmin,
      ),
    );
  }

  for (const [plugin, entry] of Object.entries(manifest.public.plugins)) {
    const granted = new Set(entry.actions);
    for (const [action, method, path] of PLUGIN_PROBES[plugin] ?? []) {
      if (granted.has(action)) continue; // granted plugin actions are listed in notProbed.
      checks.push(
        deniedCheck(`${plugin} ${action}`, [method, path, path.endsWith(FAKE_ID)], (category, got) => ({
          category,
          target: `${method} ${path}`,
          action: `${plugin}.${action}`,
          locale: null,
          expected: DENIED,
          got,
          consumers: entry.consumers,
        })),
      );
    }
  }
  return checks;
}

/**
 * Sends one request for a denied action and judges it. A GET answering 404 is
 * classified with `?populate=zzprobe`, so a missing route reads as not deployed.
 *
 * @param {Http} http
 * @param {[string, string, boolean]} request method, path, whether the path holds a fake id
 * @param {boolean} importAdmin
 * @returns {Promise<{ category: Failure['category'], got: string } | undefined>}
 */
async function probeDenied(http, [method, path, fakeId], importAdmin) {
  const a = await http.request(method, path, isWrite(method) ? {} : undefined);
  const category = judgeDenied(a, { method, fakeId, importAdmin });
  if (!category) return undefined;
  if (a.status === 404 && method === 'GET' && !fakeId) {
    const c = await classifyRead(http, path.split('?')[0]);
    if (c.category === 'not deployed') return { category: c.category, got: `${describeAnswer(a)}; ${c.got}` };
  }
  return { category, got: describeAnswer(a) };
}

/**
 * @param {string} id
 * @param {[string, string, boolean]} request
 * @param {(category: Failure['category'], got: string) => Failure} toRow
 * @param {boolean} [importAdmin]
 * @returns {Check}
 */
function deniedCheck(id, request, toRow, importAdmin = false) {
  return {
    id,
    run: async (http) => {
      const r = await probeDenied(http, request, importAdmin);
      return r ? [toRow(r.category, r.got)] : [];
    },
  };
}

/**
 * Every probe for one content type, find first. A type whose find shows it is
 * not deployed gets that one row and nothing else.
 *
 * @param {Http} http
 * @param {{ ct: import('./manifest.mjs').ContentType, entry: any, locales: (string | null)[] }} type
 * @returns {Promise<Failure[]>}
 */
async function probeType(http, { ct, entry, locales }) {
  const row = (action, locale, expected, category, got) => ({
    category,
    target: ct.pluralName,
    action,
    locale,
    expected,
    got,
    consumers: entry.consumers,
  });
  const granted = new Set(entry.actions);
  const collection = ct.kind === 'collectionType';
  const path = collection ? `/${ct.pluralName}` : `/${ct.singularName}`;
  /** @type {Record<string, [string, string, boolean]>} */
  const deniedRequest = collection
    ? {
        find: ['GET', path + PAGE, false],
        findOne: ['GET', `${path}/${FAKE_ID}`, true],
        create: ['POST', path, false],
        update: ['PUT', `${path}/${FAKE_ID}`, true],
        delete: ['DELETE', `${path}/${FAKE_ID}`, true],
      }
    : { find: ['GET', path, false], update: ['PUT', path, false] }; // DELETE: see anonymousNotProbed.

  /** @type {Failure[]} */
  const rows = [];
  for (const action of CORE_ACTIONS[ct.kind]) {
    if (!(action in deniedRequest)) continue;
    if (!granted.has(action)) {
      const r = await probeDenied(http, deniedRequest[action], false);
      if (r) rows.push(row(action, null, DENIED, r.category, r.got));
    } else if (collection) {
      const one = action === 'findOne';
      const r = await grantedRead(http, {
        path: one ? `${path}/${FAKE_ID}` : path,
        query: one ? '' : PAGE,
        expected: one ? 404 : 200,
        contentRequired: false,
      });
      if (!r.ok) rows.push(row(action, null, one ? '404 (fake id)' : '200', r.category, r.got));
    } else if (action === 'find') {
      // Grants once; content per locale (or once when not localized / not required).
      const contentRequired = locales.length > 0;
      for (const locale of contentRequired ? locales : [null]) {
        const r = await grantedRead(http, {
          path,
          query: locale ? `?locale=${locale}` : '',
          expected: 200,
          contentRequired,
          emptyOk: !contentRequired,
        });
        if (r.ok) continue;
        if (r.category !== 'missing content') {
          rows.push(row('find', null, '200', r.category, r.got));
          break;
        }
        rows.push(row('find', locale, 'published', r.category, r.got));
      }
    }
    if (action === 'find' && rows.some((r) => r.category === 'not deployed')) return rows;
  }
  return rows;
}

/**
 * What the anonymous half deliberately does not probe, listed in every report.
 * Single-type DELETE stays listed when the admin half ran, since it is still
 * never sent; the reason then says the exact-set read covers the grant.
 *
 * @param {{ manifest: any, surface: import('./manifest.mjs').Surface, adminChecked?: boolean }} options
 * @returns {{ target: string, action: string, reason: string }[]}
 */
export function anonymousNotProbed({ manifest, surface, adminChecked = false }) {
  const list = [];
  const coverage = adminChecked
    ? "Covered by the admin read of Public's exact grant set."
    : 'Not covered: the admin checks did not run.';
  for (const ct of surface.contentTypes) {
    if (ct.kind !== 'singleType' || !(ct.pluralName in manifest.public.contentTypes)) continue;
    list.push({
      target: ct.pluralName,
      action: 'delete',
      reason: `Single types have no id to fake: a granted DELETE would delete the live entry. ${coverage}`,
    });
  }
  for (const [handler, entry] of Object.entries(manifest.public.customRoutes)) {
    if (entry.actions.length) {
      list.push({ target: `${entry.method} ${entry.path}`, action: handler, reason: 'Granted custom route: no harmless request.' });
    }
  }
  for (const [plugin, entry] of Object.entries(manifest.public.plugins)) {
    for (const action of entry.actions) {
      list.push({ target: plugin, action, reason: 'Granted plugin action: no harmless request.' });
    }
  }
  return list;
}
