/**
 * `version-injector` middleware
 */

import { Strapi } from '@strapi/strapi';

export default (config, { strapi }: { strapi: Strapi }) => {
  // Add your own logic here.
  return async (ctx, next) => {
    // strapi.log.info('In version-injector middleware.');

    await next();
    ctx.set('cms-version', process.env.npm_package_version);
    ctx.set('Access-Control-Expose-Headers', 'cms-version');
  };
};
