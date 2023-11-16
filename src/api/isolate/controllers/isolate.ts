/**
 * isolate controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::isolate.isolate', ({ strapi }) => ({
    async import(ctx, next) {
        try {
            const data = await strapi
                .service("api::isolate.isolate")
                .import(ctx);

            ctx.body = data;
            next();
        } catch (err) {
            console.log("Data import failed with an error: " + err);
            ctx.badRequest("Data import failed with an error: ", { details: err });
        }
    }
}));