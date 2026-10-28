/**
 * import-admin router
 *
 * Endpoints for the external Import CLI: two parametric data endpoints, plus
 * `record-import`, which the CLI calls last to stamp the `data-import` single
 * type after a successful run. All are gated by the
 * `global::is-import-token` policy: a request with no credentials is rejected by
 * the api-token auth strategy (401); a request bearing any token other than the
 * dedicated custom Import token is rejected by the policy (403).
 *
 * These are content-API routes, so Strapi prepends the configured REST prefix
 * (default `/api`). Effective paths: `<prefix>/import-admin/truncate`,
 * `<prefix>/import-admin/bulk-create` and `<prefix>/import-admin/record-import`.
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
    {
      method: 'POST',
      path: '/import-admin/record-import',
      handler: 'import-admin.recordImport',
      config: {
        policies: ['global::is-import-token'],
      },
    },
  ],
};
