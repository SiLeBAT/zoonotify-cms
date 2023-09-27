export default [
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  {
    name: 'global::version-injector',
    config: {
      enabled: true,
      conf: {},
    },
  },
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
