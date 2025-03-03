/**
 * isolate controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::isolate.isolate', ({ strapi }) => ({
  async import(ctx) {
    try {
      const data = await strapi.service('api::isolate.isolate').import(ctx);
      ctx.body = data;
    } catch (err) {
      console.error('Data import failed with an error:', err);
      ctx.badRequest(`Data import failed: ${err.message}`);
    }
  },
}));