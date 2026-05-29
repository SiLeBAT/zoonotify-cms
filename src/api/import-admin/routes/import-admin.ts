/**
 * import-admin router
 *
 * Two parametric endpoints for the external Import CLI. Both are gated by the
 * `global::is-import-token` policy: a request with no credentials is rejected by
 * the api-token auth strategy (401); a request bearing any token other than the
 * dedicated custom Import token is rejected by the policy (403).
 *
 * These are content-API routes, so Strapi prepends the configured REST prefix
 * (default `/api`). Effective paths: `<prefix>/import-admin/truncate` and
 * `<prefix>/import-admin/bulk-create`.
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/import-admin/truncate',
      handler: 'import-admin.truncate',
      config: {
        policies: ['global::is-import-token'],
      },
    },
    {
      method: 'POST',
      path: '/import-admin/bulk-create',
      handler: 'import-admin.bulkCreate',
      config: {
        policies: ['global::is-import-token'],
      },
    },
  ],
};
