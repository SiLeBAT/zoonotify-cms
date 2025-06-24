/**
 * `version-injector` middleware
 */

import type { Strapi as StrapiType } from '@strapi/types/dist/core';
import { version } from './../../package.json';

export default (config: any, { strapi }: { strapi: StrapiType }) => {
  return async (ctx: any, next: () => Promise<any>) => {
    await next();
    ctx.set('cms-version', version);
    ctx.set('Access-Control-Expose-Headers', 'cms-version');
  };
};

