// @ts-check
// Test support for probe.test.mjs: an in-memory stand-in for a Strapi 5 host's
// content API, answering anonymous requests the way Strapi 5.59 does (route
// lookup → permission check → query validation → handler). Not used at
// runtime.

const err = (status, name, message) => ({ status, body: { data: null, error: { status, name, message } } });
const NOT_FOUND = err(404, 'NotFoundError', 'Not Found');
const FORBIDDEN = err(403, 'ForbiddenError', 'Forbidden');
const MISSING_DATA = err(400, 'ValidationError', 'Missing "data" payload in the request body');

/** users-permissions and upload content-API routes (from their Strapi 5.59 route files). */
const PLUGIN_ROUTES = [
  ['GET', '/connect/:any', 'plugin::users-permissions.auth.connect'],
  ['POST', '/auth/local', 'plugin::users-permissions.auth.callback'],
  ['POST', '/auth/local/register', 'plugin::users-permissions.auth.register'],
  ['POST', '/auth/forgot-password', 'plugin::users-permissions.auth.forgotPassword'],
  ['POST', '/auth/reset-password', 'plugin::users-permissions.auth.resetPassword'],
  ['GET', '/auth/email-confirmation', 'plugin::users-permissions.auth.emailConfirmation'],
  ['POST', '/auth/send-email-confirmation', 'plugin::users-permissions.auth.sendEmailConfirmation'],
  ['POST', '/auth/change-password', 'plugin::users-permissions.auth.changePassword'],
  ['POST', '/auth/refresh', 'plugin::users-permissions.auth.refresh'],
  ['POST', '/auth/logout', 'plugin::users-permissions.auth.logout'],
  ['GET', '/auth/sessions', 'plugin::users-permissions.auth.getSessions'],
  ['DELETE', '/auth/sessions/:id', 'plugin::users-permissions.auth.revokeSession'],
  ['GET', '/users/count', 'plugin::users-permissions.user.count'],
  ['GET', '/users/me', 'plugin::users-permissions.user.me'],
  ['GET', '/users', 'plugin::users-permissions.user.find'],
  ['GET', '/users/:id', 'plugin::users-permissions.user.findOne'],
  ['POST', '/users', 'plugin::users-permissions.user.create'],
  ['PUT', '/users/:id', 'plugin::users-permissions.user.update'],
  ['DELETE', '/users/:id', 'plugin::users-permissions.user.destroy'],
  ['GET', '/users-permissions/roles', 'plugin::users-permissions.role.find'],
  ['GET', '/users-permissions/roles/:id', 'plugin::users-permissions.role.findOne'],
  ['POST', '/users-permissions/roles', 'plugin::users-permissions.role.createRole'],
  ['PUT', '/users-permissions/roles/:id', 'plugin::users-permissions.role.updateRole'],
  ['DELETE', '/users-permissions/roles/:id', 'plugin::users-permissions.role.deleteRole'],
  ['GET', '/users-permissions/permissions', 'plugin::users-permissions.permissions.getPermissions'],
  ['POST', '/upload', 'plugin::upload.content-api.upload'],
  ['GET', '/upload/files', 'plugin::upload.content-api.find'],
  ['GET', '/upload/files/:id', 'plugin::upload.content-api.findOne'],
  ['DELETE', '/upload/files/:id', 'plugin::upload.content-api.destroy'],
];

/**
 * @param {{
 *   surface: import('./manifest.mjs').Surface,
 *   grants: Iterable<string>,
 *   published?: Iterable<string>,
 *   notDeployed?: string[],
 *   signUps?: boolean,
 *   headers?: Record<string, string>,
 *   answer?: (method: string, path: string) => { status: number, body?: any } | Error | undefined,
 * }} host
 *   `grants`: Public's action uids. `published`: `<pluralName>:<locale>` per
 *   published single-type entry (`<pluralName>:` when not localized).
 *   `notDeployed`: pluralNames whose routes don't exist. `answer`: overrides.
 */
export function fakeCms({ surface, grants, published = [], notDeployed = [], signUps = false, headers = {}, answer }) {
  const granted = new Set(grants);
  const content = new Set(published);
  /** @type {{ method: string, pattern: RegExp, uid: string, handle: (req: any) => { status: number, body?: any } }[]} */
  const routes = [];
  const add = (method, path, uid, handle) =>
    routes.push({ method, pattern: new RegExp(`^${path.replace(/:[a-z]+/g, '[^/]+')}$`), uid, handle });

  for (const ct of surface.contentTypes) {
    if (notDeployed.includes(ct.pluralName)) continue;
    if (ct.kind === 'collectionType') {
      const p = `/${ct.pluralName}`;
      add('GET', p, `${ct.uid}.find`, () => ({ status: 200, body: { data: [], meta: {} } }));
      add('GET', `${p}/:id`, `${ct.uid}.findOne`, () => NOT_FOUND);
      add('POST', p, `${ct.uid}.create`, () => MISSING_DATA);
      add('PUT', `${p}/:id`, `${ct.uid}.update`, () => MISSING_DATA);
      add('DELETE', `${p}/:id`, `${ct.uid}.delete`, () => NOT_FOUND);
    } else {
      const p = `/${ct.singularName}`;
      add('GET', p, `${ct.uid}.find`, ({ query }) => {
        const locale = ct.localized ? (query.get('locale') ?? 'en') : '';
        return content.has(`${ct.pluralName}:${locale}`) ? { status: 200, body: { data: {} } } : NOT_FOUND;
      });
      add('PUT', p, `${ct.uid}.update`, () => MISSING_DATA);
      add('DELETE', p, `${ct.uid}.delete`, () => ({ status: 200, body: { data: {} } }));
    }
  }
  for (const route of surface.customRoutes) {
    add(route.method, route.path, route.handler, () => err(400, 'ValidationError', 'No file'));
  }
  for (const [method, path, uid] of PLUGIN_ROUTES) {
    add(method, path, uid, () => {
      if (uid.endsWith('auth.register') && !signUps) return err(400, 'ApplicationError', 'Register action is currently disabled');
      return method === 'GET' ? { status: 200, body: [] } : err(400, 'ValidationError', 'Invalid body');
    });
  }

  const respond = (method, url) => {
    const { pathname, searchParams: query } = new URL(url);
    const path = pathname.replace(/^\/api/, '');
    const override = answer?.(method, path + (query.size ? `?${query}` : ''));
    if (override instanceof Error) throw override;
    if (override) return override;

    const route = routes.find((r) => r.method === method && r.pattern.test(path));
    if (!route) return method === 'GET' ? NOT_FOUND : err(405, 'MethodNotAllowedError', 'Method Not Allowed');
    if (!granted.has(route.uid)) return FORBIDDEN;
    // is-import-token rejects every request that is not the Import token.
    if (route.uid.startsWith('api::import-admin.')) return err(403, 'PolicyError', 'Policy Failed');
    if (query.get('populate') === 'zzprobe') return err(400, 'ValidationError', 'Invalid key zzprobe');
    return route.handle({ query });
  };

  /** @type {(url: string, init?: any) => Promise<Response>} */
  const fetch = async (url, init = {}) => {
    const { status, body } = respond(init.method ?? 'GET', url);
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    });
  };
  return fetch;
}
