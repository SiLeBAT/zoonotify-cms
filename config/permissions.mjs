// Permission manifest: the INTENDED grants for this CMS's content API.
//
// Grants live in each host's database and are changed by hand in the admin
// panel. Code never writes them to a deployed host; the permission probe
// (`yarn permissions:probe`) compares a host against this file, and any
// difference is drift. To change a grant, change it in the admin panel AND
// here, in the same release. Only `yarn permissions:apply` writes this file
// into a database, and only into a local development one.
//
// Not a Strapi config file: Strapi loads only .js/.json config files, and the
// TypeScript build does not copy .mjs into dist/. Node scripts and vitest
// import it directly.
//
// Shape (keep it a plain object; scripts/permissions/manifest.mjs reads it):
// - public.contentTypes: one entry per content type, keyed by pluralName.
//     actions        granted Public actions; [] is a deliberate deny.
//                    collection: find, findOne, create, update, delete
//                    single:     find, update, delete
//     consumers      who the read is for: 'client', 'publicDataApi'.
//     publicDataApi  tag group in the API reference (scripts/api-reference/
//                    base.mjs). Order within a group is the order here.
//     reason         why the entry is what it is.
//   Every single type with 'client' among its consumers must have published
//   content: per locale if localized, once otherwise.
// - public.customRoutes: one entry per custom-route handler, keyed by its
//   action uid. `actions` is [] or [<the handler's action name>].
// - public.plugins: content-API plugin actions, as `controller.action`.
// - authenticated: the Authenticated role's grants (Zoonotify has no site users).
// - roles: the exact users-permissions role inventory.
// - signUps: the users-permissions "Enable sign-ups" advanced setting.
// - importToken: the only content-API token a host may have. Expiry and
//   rotation are not asserted.
// - locales: the content locales the probe checks content in.
//
// Every content type, custom-route handler and plugin needs an entry
// (scripts/permissions/coverage.test.mjs fails otherwise).
//
// Admin-side reader for the probe (set up by hand once per host, not checked):
// 1. Settings > Administration panel > Roles: create the admin role
//    `permissions-reader` holding only these permissions:
//      admin::api-tokens.read
//      plugin::users-permissions.roles.read
//      plugin::users-permissions.advanced-settings.read
// 2. Create an admin user `permissions-reader` with only that role.
// 3. Create one admin token for it per host, and store it as
//    PERMISSIONS_READER_TOKEN in the probe's env file on that server. Never pass
//    it on the command line and never commit it.

const READ_COLLECTION = ['find', 'findOne'];
const READ_SINGLE = ['find'];
const BOTH = ['client', 'publicDataApi'];
const CLIENT = ['client'];

export default {
  locales: ['de', 'en'],

  public: {
    contentTypes: {
      // Public Data API, in the API reference's order.
      prevalences: {
        actions: READ_COLLECTION,
        consumers: BOTH,
        publicDataApi: 'Surveillance data',
        reason: 'Prevalence results; the prevalence page and the Public Data API.',
      },
      resistances: {
        actions: READ_COLLECTION,
        consumers: BOTH,
        publicDataApi: 'Surveillance data',
        reason: 'Resistance results; the antibiotic-resistance pages and the Public Data API.',
      },
      'multi-resistances': {
        actions: READ_COLLECTION,
        consumers: BOTH,
        publicDataApi: 'Surveillance data',
        reason: 'Multi-resistance results; the multi-resistance page and the Public Data API.',
      },
      microorganisms: {
        actions: READ_COLLECTION,
        consumers: BOTH,
        publicDataApi: 'Reference vocabularies',
        reason: 'Filter values and populated relation on surveillance data.',
      },
      matrices: {
        actions: READ_COLLECTION,
        consumers: BOTH,
        publicDataApi: 'Reference vocabularies',
        reason: 'Filter values and populated relation on surveillance data.',
      },
      'matrix-groups': {
        actions: READ_COLLECTION,
        consumers: BOTH,
        publicDataApi: 'Reference vocabularies',
        reason: 'Filter values and populated relation on surveillance data.',
      },
      'matrix-details': {
        actions: READ_COLLECTION,
        consumers: BOTH,
        publicDataApi: 'Reference vocabularies',
        reason: 'Populated by the client through populate=* on resistances and multi-resistances.',
      },
      'sample-origins': {
        actions: READ_COLLECTION,
        consumers: BOTH,
        publicDataApi: 'Reference vocabularies',
        reason: 'Filter values and populated relation on surveillance data.',
      },
      'super-category-sample-origins': {
        actions: READ_COLLECTION,
        consumers: BOTH,
        publicDataApi: 'Reference vocabularies',
        reason: 'Filter values and populated relation on surveillance data.',
      },
      'sampling-stages': {
        actions: READ_COLLECTION,
        consumers: BOTH,
        publicDataApi: 'Reference vocabularies',
        reason: 'Filter values and populated relation on surveillance data.',
      },
      'sample-types': {
        actions: READ_COLLECTION,
        consumers: BOTH,
        publicDataApi: 'Reference vocabularies',
        reason: 'Populated by the client through populate=* on resistances.',
      },
      species: {
        actions: READ_COLLECTION,
        consumers: BOTH,
        publicDataApi: 'Reference vocabularies',
        reason: 'Filter values and populated relation on surveillance data.',
      },
      'antimicrobial-substances': {
        actions: READ_COLLECTION,
        consumers: BOTH,
        publicDataApi: 'Reference vocabularies',
        reason: 'Populated by the client through populate=* on resistances.',
      },
      antibiotics: {
        actions: READ_COLLECTION,
        consumers: BOTH,
        publicDataApi: 'Reference vocabularies',
        reason: 'Populated by the client through resistance-tables cut_offs.antibiotic.',
      },
      'resistance-tables': {
        actions: READ_COLLECTION,
        consumers: BOTH,
        publicDataApi: 'Reference vocabularies',
        reason: 'Cut-off tables on the antibiotic-resistance pages.',
      },

      // Client only: curated publications and page content.
      evaluations: {
        actions: READ_COLLECTION,
        consumers: CLIENT,
        reason: 'Evaluations page. Curated publications rather than a data feed, so not in the Public Data API.',
      },
      'microbial-counts': {
        actions: READ_COLLECTION,
        consumers: CLIENT,
        reason: 'Microbial-counts page. Not (yet) part of the Public Data API.',
      },
      explanations: { actions: READ_COLLECTION, consumers: CLIENT, reason: 'Page content: explanations.' },
      externallinks: { actions: READ_COLLECTION, consumers: CLIENT, reason: 'Page content: links page.' },
      informations: { actions: READ_COLLECTION, consumers: CLIENT, reason: 'Page content: information texts.' },
      'amr-pages': { actions: READ_SINGLE, consumers: CLIENT, reason: 'Page content: AMR page.' },
      'amu-pages': { actions: READ_SINGLE, consumers: CLIENT, reason: 'Page content: AMU page.' },
      configurations: { actions: READ_SINGLE, consumers: CLIENT, reason: 'Client configuration.' },
      'data-imports': {
        actions: READ_SINGLE,
        consumers: CLIENT,
        reason: 'Date of the last successful import, shown as the data status. Written by the Import CLI.',
      },
      'data-protection-declarations': {
        actions: READ_SINGLE,
        consumers: CLIENT,
        reason: 'Page content: data protection declaration.',
      },
      'evaluation-informations': { actions: READ_SINGLE, consumers: CLIENT, reason: 'Page content: evaluations page.' },
      'multi-resistance-informations': {
        actions: READ_SINGLE,
        consumers: CLIENT,
        reason: 'Page content: multi-resistance page.',
      },
      'prevalence-informations': { actions: READ_SINGLE, consumers: CLIENT, reason: 'Page content: prevalence page.' },
      'prevelence-updates': {
        actions: READ_SINGLE,
        consumers: CLIENT,
        reason: 'Prevalence data date, read by the prevalence page.',
      },
      'substance-informations': {
        actions: READ_SINGLE,
        consumers: CLIENT,
        reason: 'Page content: substance detail page.',
      },
      'trend-informations': { actions: READ_SINGLE, consumers: CLIENT, reason: 'Page content: trend page.' },
      welcomes: { actions: READ_SINGLE, consumers: CLIENT, reason: 'Page content: home page.' },

      // Denied: no consumer.
      isolates: { actions: [], consumers: [], reason: 'Raw rows; exposing them is BfR\'s call.' },
      salmonellas: { actions: [], consumers: [], reason: 'Internal data behind isolates; no consumer.' },
      'sampling-contexts': { actions: [], consumers: [], reason: 'Internal data behind isolates; no consumer.' },
      'animal-species-food-categories': {
        actions: [],
        consumers: [],
        reason: 'Internal data behind isolates; no consumer.',
      },
      'animal-species-production-type-foods': {
        actions: [],
        consumers: [],
        reason: 'Internal data behind isolates; no consumer.',
      },
      'controlled-vocabularies': { actions: [], consumers: [], reason: 'Internal or legacy data; no consumer.' },
    },

    customRoutes: {
      'api::import-admin.import-admin.truncate': {
        method: 'POST',
        path: '/import-admin/truncate',
        actions: [],
        consumers: [],
        reason: 'Import token only (see importToken); never Public.',
      },
      'api::import-admin.import-admin.bulkCreate': {
        method: 'POST',
        path: '/import-admin/bulk-create',
        actions: [],
        consumers: [],
        reason: 'Import token only (see importToken); never Public.',
      },
      'api::import-admin.import-admin.recordImport': {
        method: 'POST',
        path: '/import-admin/record-import',
        actions: [],
        consumers: [],
        reason: 'Import token only (see importToken); never Public.',
      },
      'api::isolate.isolate.import': {
        method: 'POST',
        path: '/isolates/import',
        actions: [],
        consumers: [],
        reason: 'Legacy isolate upload; never Public.',
      },
    },

    plugins: {
      'users-permissions': {
        actions: [],
        consumers: [],
        reason: 'No site users: login, registration and password reset stay closed. Strapi grants auth.* by default; that is drift.',
      },
      upload: { actions: [], consumers: [], reason: 'Media is served as files, never through the upload API.' },
    },
  },

  authenticated: { actions: [] },

  roles: ['Public', 'Authenticated'],

  signUps: false,

  importToken: {
    name: 'Import',
    type: 'custom',
    actions: [
      'api::import-admin.import-admin.truncate',
      'api::import-admin.import-admin.bulkCreate',
      'api::import-admin.import-admin.recordImport',
    ],
  },
};
