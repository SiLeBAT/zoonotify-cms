// @ts-check
// The admin half of the permission probe: exact sets read through the admin
// API with the `permissions-reader` token. Rules: issues 083 and 087.

/**
 * @param {{ manifest: any, surface: import('./manifest.mjs').Surface, admin: import('./probe.mjs').Http }} options
 * @returns {import('./probe.mjs').Check[]}
 */
export function adminChecks(options) {
  return [];
}
