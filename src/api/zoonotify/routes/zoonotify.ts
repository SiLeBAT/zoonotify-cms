/**
 * zoonotify router
 */

import { factories } from '@strapi/strapi';
import { toLinkedData } from './../services/helper';

export default factories.createCoreRouter('api::zoonotify.zoonotify', {
    config: {
        find: {
            auth: false,
            policies: [],
            middlewares: [
                async (ctx, next) => {
                    console.info("running middleware on /api/zoonotifies");
                    //update your request here if needed
                    await next();
                    //update your response here if needed
                    let newResponse = [];
                    let data = ctx.response.body.data;
                    if (data && data.length > 0) {
                        newResponse.push(toLinkedData(data[0].attributes));
                        // data.forEach(element => {
                        //     newResponse.push(toLinkedData(element.attributes));
                        // });
                        ctx.response.body = newResponse;
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
