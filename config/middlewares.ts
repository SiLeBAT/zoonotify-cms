export default [
  'strapi::errors',
  // TEMPORARY DIAGNOSTIC — remove together with src/middlewares/nan-filter-tracer.ts
  // once the "Expected a valid Number, got NaN" source is identified. Sits just
  // inside `strapi::errors` so it sees the raw throw before it is formatted, and
  // outside `strapi::query` so `ctx.query` is already parsed when it logs.
  {
    name: 'global::nan-filter-tracer',
    config: {
      enabled: true,
    },
  },
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
