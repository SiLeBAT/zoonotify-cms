/**
 * `is-import-token` global policy
 *
 * Gates the /import-admin/* routes so that only the dedicated Import API token
 * may call them.
 *
 * - No credentials → the api-token auth strategy short-circuits with 401 before
 *   this policy runs.
 * - A full-access or read-only token → reaches this policy (full-access bypasses
 *   route-permission checks) and is rejected here (403).
 * - A custom token → Strapi's api-token strategy only lets it reach a route it
 *   has been explicitly granted, so a custom token arriving here is, by
 *   configuration, the Import token. It passes.
 *
 * See ADR 0003 § Import role and the CMS README operator step.
 */

export default (policyContext: any, _config: unknown, { strapi }: { strapi: any }): boolean => {
  const auth = policyContext.state?.auth;

  if (!auth || auth.strategy?.name !== 'api-token') {
    return false;
  }

  const token = auth.credentials;
  if (!token) {
    return false;
  }

  // Only a custom-scoped token (the Import token) is accepted; full-access and
  // read-only tokens are explicitly rejected even though they authenticate.
  return token.type === 'custom';
};
