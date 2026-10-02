// Hand-written part of the Public Data API description. The generator adds
// `paths` and the per-collection schemas.
//
// `info.version` is the Public Data API's own semver, not the CMS version.
// Bump it in the same commit as the regenerated spec:
//   major: a field, collection or query parameter removed or renamed
//   minor: additions
//   patch: wording only

const STRAPI_FILTERS_DOCS = 'https://docs.strapi.io/cms/api/rest/filters';

const errorBody = (status, name, message, details = {}) => ({
  data: null,
  error: { status, name, message, details },
});

const errorResponse = (description, examples) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, examples } },
});

export default {
  openapi: '3.0.3',
  info: {
    title: 'Zoonotify Public Data API',
    version: '1.0.0',
    description: [
      'Read-only, anonymous access to the zoonoses surveillance data published on',
      '[Zoonotify](https://zoonotify.bfr.berlin), plus the reference vocabularies needed to',
      'interpret it. No authentication is required.',
      '',
      'Only the collections, fields and query parameters described here are supported.',
      'Anything else the server happens to answer is unsupported and may change or disappear',
      'without notice.',
      '',
      'The API is versioned independently of the Zoonotify site. A new major version may',
      'break existing scripts; minor versions only add.',
      '',
      'Most collections hold records in English (`en`, the default) and German (`de`); pick one',
      'with the `locale` parameter. The same `documentId` names a record in both languages.',
      'Collections without a `locale` parameter exist in one language only.',
    ].join('\n'),
    contact: { name: 'BfR', url: 'https://zoonotify.bfr.berlin' },
  },
  servers: [{ url: 'https://zoonotify.bfr.berlin/cms/api' }],
  security: [],
  tags: [
    {
      name: 'Surveillance data',
      description: 'Prevalence and antimicrobial-resistance results from German zoonoses monitoring.',
    },
    {
      name: 'Reference vocabularies',
      description: 'Controlled lists of terms that surveillance records point to. Use them to find valid filter values.',
    },
  ],
  paths: {},
  components: {
    parameters: {
      documentId: {
        name: 'documentId',
        in: 'path',
        required: true,
        description: 'The record\'s `documentId`, as returned by the list operation.',
        schema: { type: 'string' },
      },
      filters: {
        name: 'filters',
        in: 'query',
        description: `Narrow the results, e.g. \`filters[samplingYear][$eq]=2022\` or \`filters[microorganism][name][$eq]=Salmonella spp.\`. See [Strapi's filter operators](${STRAPI_FILTERS_DOCS}). An unknown field or operator returns 400.`,
        style: 'deepObject',
        explode: true,
        schema: { type: 'object', additionalProperties: true },
      },
      sort: {
        name: 'sort',
        in: 'query',
        description: 'Sort by one or more attributes, each optionally suffixed with `:asc` or `:desc`. Repeat the parameter for several. An unknown attribute returns 400.',
        style: 'form',
        explode: true,
        schema: { type: 'array', items: { type: 'string' } },
        example: ['samplingYear:desc'],
      },
      paginationPage: {
        name: 'pagination[page]',
        in: 'query',
        description: 'Page number, starting at 1.',
        schema: { type: 'integer', minimum: 1, default: 1 },
      },
      paginationPageSize: {
        name: 'pagination[pageSize]',
        in: 'query',
        description: 'Records per page. Larger values are silently capped at 8000; non-numeric values are ignored.',
        schema: { type: 'integer', minimum: 1, maximum: 8000, default: 25 },
      },
      locale: {
        name: 'locale',
        in: 'query',
        description: 'Language of the records. One `documentId` names the same record in both locales. A locale other than these returns an empty list rather than an error.',
        schema: { type: 'string', enum: ['en', 'de'], default: 'en' },
      },
    },
    responses: {
      BadRequest: errorResponse('Invalid query parameter, e.g. an unknown field in `filters`, `sort`, `fields` or `populate`.', {
        ValidationError: {
          value: errorBody(400, 'ValidationError', 'Invalid key foo', {
            key: 'foo',
            path: 'foo',
            source: 'query',
            param: 'filters',
          }),
        },
      }),
      NotFound: errorResponse('No record with this `documentId` in the requested locale.', {
        NotFoundError: { value: errorBody(404, 'NotFoundError', 'Not Found') },
      }),
      ServerError: errorResponse('Server error. Retry later, and report it if it persists.', {
        InternalServerError: { value: errorBody(500, 'InternalServerError', 'Internal Server Error') },
      }),
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['data', 'error'],
        properties: {
          data: { type: 'object', nullable: true, description: 'Always `null`.' },
          error: {
            type: 'object',
            required: ['status', 'name', 'message', 'details'],
            properties: {
              status: { type: 'integer' },
              name: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
      Pagination: {
        type: 'object',
        required: ['page', 'pageSize', 'pageCount', 'total'],
        properties: {
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          pageCount: { type: 'integer' },
          total: { type: 'integer' },
        },
      },
    },
  },
};
