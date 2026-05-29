/**
 * import-admin controller
 *
 * Thin HTTP adapter: validates the request body, delegates to the import-admin
 * service, and maps domain errors (unknown collection, malformed locale row) to
 * HTTP 400. Access control is handled upstream by the `global::is-import-token`
 * policy on the routes.
 */

import { UnknownCollectionError } from '../lib/collection-allow-list';
import { MissingBaseLocaleError } from '../lib/locale-payloads';

const isBadRequest = (error: unknown): error is Error =>
  error instanceof UnknownCollectionError || error instanceof MissingBaseLocaleError;

export default ({ strapi }: { strapi: any }) => ({
  async truncate(ctx: any) {
    const { collection } = ctx.request.body ?? {};
    if (typeof collection !== 'string') {
      return ctx.badRequest('"collection" is required and must be a string');
    }

    try {
      const deleted = await strapi
        .service('api::import-admin.import-admin')
        .truncate(collection);
      ctx.body = { collection, deleted };
    } catch (error) {
      if (isBadRequest(error)) {
        return ctx.badRequest((error as Error).message);
      }
      throw error;
    }
  },

  async bulkCreate(ctx: any) {
    const { collection, rows } = ctx.request.body ?? {};
    if (typeof collection !== 'string') {
      return ctx.badRequest('"collection" is required and must be a string');
    }
    if (!Array.isArray(rows)) {
      return ctx.badRequest('"rows" is required and must be an array');
    }

    try {
      const created = await strapi
        .service('api::import-admin.import-admin')
        .bulkCreate(collection, rows);
      ctx.body = { collection, created };
    } catch (error) {
      if (isBadRequest(error)) {
        return ctx.badRequest((error as Error).message);
      }
      throw error;
    }
  },
});
