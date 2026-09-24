// Behind Apache the CMS is served under a prefix (e.g. /cms) that Apache strips
// before proxying, so Strapi sees /admin while the browser is on /cms/admin.
// Strapi's refresh cookie defaults to path=/admin, which the browser then never
// sends back: every token refresh 401s and the admin bounces to the login page.
// Derive the browser-facing prefix from SERVER_URL, which already carries it.
const publicPathPrefix = (serverUrl: string) =>
  new URL(serverUrl).pathname.replace(/\/+$/, '');

export default ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
    cookie: {
      path: `${publicPathPrefix(env('SERVER_URL', 'http://localhost:1337'))}/admin`,
    },
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
});
