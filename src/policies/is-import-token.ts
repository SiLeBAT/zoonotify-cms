/**
 * `is-import-token` global policy
 *
 * Gates the /import-admin/* routes so that only the Import token may call them:
 * a `custom` content-API token whose name and grant set equal the `importToken`
 * section of config/permissions.mjs exactly. Anything else is refused with a
 * 403 `PolicyError` naming the mismatch, so a drifted Import token makes the
 * next import fail loudly instead of running through an over-scoped token.
 *
 * - No credentials → the content-api-token strategy short-circuits with 401
 *   before this policy runs.
 * - Full-access and read-only tokens reach this policy (full-access bypasses
 *   route-permission checks) and are refused here.
 * - The check cannot stop an extra grant on a core route from working; the
 *   permission probe detects that.
 *
 * See ADR 0003 § Import role and the CMS README operator step.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { errors } from '@strapi/utils';

type ImportTokenSpec = { name: string; type: string; actions: string[] };

// The manifest is not Strapi config and the TypeScript build does not copy it
// into dist/, so it is loaded from the app root (the checkout, in development
// and when deployed alike). Node caches the module after the first request.
const loadImportTokenSpec = (appRoot: string): ImportTokenSpec => {
  const requireFromApp = createRequire(path.join(appRoot, 'package.json'));
  return requireFromApp('./config/permissions.mjs').default.importToken;
};

const refuse = (reason: string): never => {
  throw new errors.PolicyError(`Not the Import token: ${reason}`);
};

export default (policyContext: any, _config: unknown, { strapi }: { strapi: any }): true => {
  const auth = policyContext.state?.auth;

  // Strapi renamed this strategy from `api-token` (5.10) to `content-api-token`;
  // matching the old name made every Import call fail with `403 Policy Failed`.
  if (!auth || auth.strategy?.name !== 'content-api-token' || !auth.credentials) {
    return refuse('the request was not authenticated by a content-API token');
  }

  const token = auth.credentials;
  const expected = loadImportTokenSpec(strapi.dirs.app.root);

  if (token.type !== expected.type) {
    return refuse(`token type is ${token.type}, expected ${expected.type}`);
  }
  if (token.name !== expected.name) {
    return refuse(`token is named ${token.name}, expected ${expected.name}`);
  }

  const granted: string[] = token.permissions ?? [];
  const missing = expected.actions.filter((action) => !granted.includes(action));
  const extra = granted.filter((action) => !expected.actions.includes(action));
  if (missing.length > 0 || extra.length > 0) {
    return refuse(
      `grants differ from config/permissions.mjs (missing: ${missing.join(', ') || 'none'}; ` +
        `extra: ${extra.join(', ') || 'none'})`,
    );
  }

  return true;
};
