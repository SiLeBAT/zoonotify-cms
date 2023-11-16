/**
 * isolate router
 */
import { factories } from '@strapi/strapi';
import { toLinkedData } from '../extensions/helper';
import { IIsolateResponse } from '../models/response';

const defaultRouter = factories.createCoreRouter('api::isolate.isolate', {
    config: {
        find: {
            policies: [],
            middlewares: [
                async (ctx, next) => {
                    console.log("running middleware on /api/isolates");
                    //update your request here if needed
                    await next();
                    //update your response here if needed
                    const contentType = ctx?.request?.header['content-type'];
                    if(contentType == 'application/ld+json'){
                        let response: IIsolateResponse = ctx.response.body;

                        if (response.data && response.data.length > 0) {
                            console.time("JSON to JSON-LD");
                            ctx.response.body = toLinkedData(response.data);
                            console.timeEnd("JSON to JSON-LD");
                        }
                    }
                    return ctx;
                }
            ],
        },
        findOne: {},
        create: {},
        update: {},
        delete: {},
    }
});

const customRouter = (innerRouter, extraRoutes = []) => {
    let routes;
    return {
        get prefix() {
            return innerRouter.prefix;
        },
        get routes() {
            if (!routes) routes = innerRouter.routes.concat(extraRoutes);
            return routes;
        },
    };
};

const myExtraRoutes = [
    {
        method: "POST",
        path: "/isolates/import",
        handler: "api::isolate.isolate.import",
    },
];

module.exports = customRouter(defaultRouter, myExtraRoutes);