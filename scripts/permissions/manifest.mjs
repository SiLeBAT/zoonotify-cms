// @ts-check
// Reads the permission manifest (config/permissions.mjs) against the CMS's
// actual API surface. The surface comes from source files only: no database,
// no Strapi boot.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CMS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * @typedef {{ uid: string, pluralName: string, singularName: string, kind: 'collectionType' | 'singleType', localized: boolean }} ContentType
 * @typedef {{ handler: string, method: string, path: string }} CustomRoute
 * @typedef {{ contentTypes: ContentType[], customRoutes: CustomRoute[], plugins: string[] }} Surface
 */

/**
 * The plugins whose content-API actions the manifest decides on. Both ship
 * with Strapi; users-permissions grants Public `auth.*` by default.
 */
export const CONTENT_API_PLUGINS = ['users-permissions', 'upload'];

const sortedDirs = (path) =>
  readdirSync(path, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

const listDir = (path) => {
  try {
    return sortedDirs(path);
  } catch {
    return [];
  }
};

/**
 * Reads the CMS's content-API surface from `src/api`: every content type, and
 * every route with an explicit handler (core routers have none in source).
 *
 * @param {string} [cmsRoot]
 * @returns {Surface}
 */
export function loadSurface(cmsRoot = CMS_ROOT) {
  const apiDir = join(cmsRoot, 'src', 'api');
  /** @type {ContentType[]} */
  const contentTypes = [];
  /** @type {CustomRoute[]} */
  const customRoutes = [];

  for (const api of sortedDirs(apiDir)) {
    const ctDir = join(apiDir, api, 'content-types');
    for (const name of listDir(ctDir)) {
      const schema = JSON.parse(readFileSync(join(ctDir, name, 'schema.json'), 'utf8'));
      contentTypes.push({
        uid: `api::${api}.${name}`,
        pluralName: schema.info.pluralName,
        singularName: schema.info.singularName,
        kind: schema.kind,
        localized: schema.pluginOptions?.i18n?.localized === true,
      });
    }

    const routesDir = join(apiDir, api, 'routes');
    let files = [];
    try {
      files = readdirSync(routesDir).filter((f) => /\.[jt]s$/.test(f)).sort();
    } catch {
      continue;
    }
    for (const file of files) {
      customRoutes.push(...customRoutesIn(readFileSync(join(routesDir, file), 'utf8'), api));
    }
  }
  return { contentTypes, customRoutes, plugins: [...CONTENT_API_PLUGINS] };
}

/**
 * Pairs each `handler:` in a route file with the nearest `method:` and `path:`
 * before it. A short handler (`controller.action`) belongs to the file's API.
 */
function customRoutesIn(source, api) {
  const all = (re) => [...source.matchAll(re)].map((m) => ({ at: m.index ?? 0, value: m[1] }));
  const before = (list, at) => list.filter((x) => x.at < at).pop()?.value ?? '?';
  const methods = all(/\bmethod\s*:\s*['"`]([A-Za-z]+)['"`]/g);
  const paths = all(/\bpath\s*:\s*['"`]([^'"`]+)['"`]/g);
  return all(/\bhandler\s*:\s*['"`]([^'"`]+)['"`]/g).map(({ at, value }) => ({
    handler: value.includes('::') ? value : `api::${api}.${value}`,
    method: before(methods, at).toUpperCase(),
    path: before(paths, at),
  }));
}

/**
 * Every content type, custom route and content-API plugin must have a manifest
 * entry, so that a deny is a decision rather than an oversight.
 *
 * @param {any} manifest
 * @param {Surface} surface
 * @returns {string[]} problems; empty when the manifest covers the surface
 */
export function coverageProblems(manifest, surface) {
  const problems = [];
  const { contentTypes, customRoutes, plugins } = manifest.public;
  const typeByPlural = new Map(surface.contentTypes.map((ct) => [ct.pluralName, ct]));
  const routeByHandler = new Map(surface.customRoutes.map((r) => [r.handler, r]));

  for (const ct of surface.contentTypes) {
    if (!(ct.pluralName in contentTypes)) problems.push(`content type ${ct.pluralName} has no manifest entry`);
  }
  for (const route of surface.customRoutes) {
    if (!(route.handler in customRoutes)) {
      problems.push(`custom route ${route.method} ${route.path} (${route.handler}) has no manifest entry`);
    }
  }
  for (const plugin of surface.plugins) {
    if (!(plugin in plugins)) problems.push(`plugin ${plugin} has no manifest entry`);
  }

  for (const plural of Object.keys(contentTypes)) {
    if (!typeByPlural.has(plural)) problems.push(`manifest entry ${plural} names no content type`);
  }
  for (const handler of Object.keys(customRoutes)) {
    if (!routeByHandler.has(handler)) problems.push(`manifest entry ${handler} names no custom route`);
  }
  for (const plugin of Object.keys(plugins)) {
    if (!surface.plugins.includes(plugin)) problems.push(`manifest entry ${plugin} names no content-API plugin`);
  }

  const unknownActions = (name, actions, allowed, what) => {
    for (const action of actions) {
      if (!allowed.includes(action)) {
        problems.push(`${name} grants unknown action ${action} (a ${what} has ${allowed.join(', ')})`);
      }
    }
  };
  for (const [plural, { actions }] of Object.entries(contentTypes)) {
    const ct = typeByPlural.get(plural);
    if (ct) unknownActions(plural, actions, CORE_ACTIONS[ct.kind], ct.kind);
  }
  for (const [handler, { actions }] of Object.entries(customRoutes)) {
    if (routeByHandler.has(handler)) unknownActions(handler, actions, [actionName(handler)], 'custom route');
  }
  return problems;
}

/** The actions Strapi's core router exposes per content-type kind. */
export const CORE_ACTIONS = {
  collectionType: ['find', 'findOne', 'create', 'update', 'delete'],
  singleType: ['find', 'update', 'delete'],
};

/** `api::isolate.isolate.import` → `import` */
const actionName = (handler) => handler.slice(handler.lastIndexOf('.') + 1);

/**
 * The content the client needs published: every single type with `client`
 * among its consumers, once per manifest locale if localized, else once
 * (`locale: null`). Collections may be empty, so none are listed.
 *
 * @param {any} manifest
 * @param {Surface} surface
 * @returns {{ pluralName: string, route: string, locale: string | null }[]}
 */
export function requiredContent(manifest, surface) {
  const required = [];
  for (const ct of surface.contentTypes) {
    const entry = manifest.public.contentTypes[ct.pluralName];
    if (ct.kind !== 'singleType' || !entry?.consumers.includes('client')) continue;
    const route = `/${ct.singularName}`;
    for (const locale of ct.localized ? manifest.locales : [null]) {
      required.push({ pluralName: ct.pluralName, route, locale });
    }
  }
  return required;
}

/**
 * The full action uids the manifest grants the Public role, sorted: the set a
 * host's Public role must equal.
 *
 * @param {any} manifest
 * @param {Surface} surface
 * @returns {string[]}
 */
export function publicActionUids(manifest, surface) {
  const uids = [];
  for (const ct of surface.contentTypes) {
    for (const action of manifest.public.contentTypes[ct.pluralName]?.actions ?? []) {
      uids.push(`${ct.uid}.${action}`);
    }
  }
  for (const [handler, { actions }] of Object.entries(manifest.public.customRoutes)) {
    if (actions.length) uids.push(handler);
  }
  for (const [plugin, { actions }] of Object.entries(manifest.public.plugins)) {
    for (const action of actions) uids.push(`plugin::${plugin}.${action}`);
  }
  return uids.sort();
}
