/**
 * labtest router
 */

import { factories } from '@strapi/strapi';

const defaultRouter = factories.createCoreRouter('api::labtest.labtest');

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
        path: "/labtests/import",
        handler: "api::labtest.labtest.import",
    },
];

module.exports = customRouter(defaultRouter, myExtraRoutes);