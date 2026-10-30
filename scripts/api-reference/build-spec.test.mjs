import { describe, expect, it } from 'vitest';
import { buildSpec } from './build-spec.mjs';

const base = {
  openapi: '3.0.3',
  info: { title: 'Test', version: '1.0.0' },
  servers: [{ url: 'https://example.test/api' }],
  security: [],
  tags: [{ name: 'Data' }],
  paths: {},
  components: {
    schemas: { Error: { type: 'object' } },
    parameters: { locale: { name: 'locale', in: 'query', schema: { enum: ['en', 'de'] } } },
    responses: {},
  },
};

const contentType = (singularName, pluralName, attributes, extra = {}) => ({
  uid: `api::${singularName}.${singularName}`,
  schema: {
    kind: 'collectionType',
    info: { singularName, pluralName, displayName: singularName },
    attributes,
    ...extra,
  },
});

const localized = { pluginOptions: { i18n: { localized: true } } };

const prevalence = contentType(
  'prevalence',
  'prevalences',
  {
    dbId: { type: 'string', private: true },
    samplingYear: { type: 'integer' },
    matrix: { type: 'relation', relation: 'oneToOne', target: 'api::matrix.matrix' },
  },
  localized,
);
const matrix = contentType('matrix', 'matrices', {
  name: { type: 'string', required: true },
  isolates: { type: 'relation', relation: 'oneToMany', target: 'api::isolate.isolate' },
});
const isolate = contentType('isolate', 'isolates', { samplingYear: { type: 'biginteger' } });
const table = contentType('resistance-table', 'resistance-tables', {
  cut_offs: { type: 'component', repeatable: true, component: 'data.cut-off' },
});
const cutOff = {
  info: { displayName: 'CutOff' },
  attributes: {
    min: { type: 'decimal' },
    antibiotic: { type: 'relation', relation: 'oneToOne', target: 'api::antibiotic.antibiotic' },
  },
};

const inApi = (tag, actions = ['find', 'findOne']) => ({
  actions,
  consumers: ['publicDataApi'],
  publicDataApi: tag,
});
const manifestWith = (contentTypes) => ({ public: { contentTypes, customRoutes: {}, plugins: {} } });

const build = (overrides = {}) =>
  buildSpec({
    contentTypes: [prevalence, matrix, isolate, table],
    components: { 'data.cut-off': cutOff },
    manifest: manifestWith({
      prevalences: inApi('Data'),
      matrices: inApi('Data'),
      isolates: { actions: [], consumers: [] },
      'resistance-tables': inApi('Data'),
    }),
    base,
    ...overrides,
  });

const param = (operation, name) => operation.parameters.find((p) => (p.name ?? p.$ref) === name);

describe('buildSpec', () => {
  it('emits GET find and findOne for each included collection only', () => {
    const spec = build();

    expect(Object.keys(spec.paths)).toEqual([
      '/prevalences',
      '/prevalences/{documentId}',
      '/matrices',
      '/matrices/{documentId}',
      '/resistance-tables',
      '/resistance-tables/{documentId}',
    ]);
    for (const item of Object.values(spec.paths)) {
      expect(Object.keys(item)).toEqual(['get']);
    }
  });

  it('skips private attributes', () => {
    const props = build().components.schemas.Prevalence.properties;

    expect(props.samplingYear).toEqual({ type: 'integer', nullable: true });
    expect(props).not.toHaveProperty('dbId');
    expect(JSON.stringify(build())).not.toContain('dbId');
  });

  it('lists relations to included collections as populate names', () => {
    const spec = build();
    const populate = param(spec.paths['/prevalences'].get, 'populate');

    expect(populate.schema.items.enum).toEqual(['matrix']);
    expect(spec.components.schemas.Prevalence.properties.matrix.allOf).toEqual([
      { $ref: '#/components/schemas/Matrix' },
    ]);
  });

  it('drops relations to excluded collections', () => {
    const spec = build();

    expect(spec.components.schemas.Matrix.properties).not.toHaveProperty('isolates');
    expect(param(spec.paths['/matrices'].get, 'populate')).toBeUndefined();
  });

  it('emits components as schemas and populate names, without their nested relations', () => {
    const spec = build();

    expect(spec.components.schemas.CutOff.properties).toEqual({
      id: { type: 'integer' },
      min: { type: 'number', nullable: true },
    });
    expect(spec.components.schemas.ResistanceTable.properties.cut_offs.items).toEqual({
      $ref: '#/components/schemas/CutOff',
    });
    expect(param(spec.paths['/resistance-tables'].get, 'populate').schema.items.enum).toEqual([
      'cut_offs',
    ]);
  });

  it('offers locale only on localized collections', () => {
    const spec = build();

    expect(param(spec.paths['/prevalences'].get, '#/components/parameters/locale')).toBeDefined();
    expect(param(spec.paths['/matrices'].get, '#/components/parameters/locale')).toBeUndefined();
    expect(spec.components.schemas.Prevalence.properties).toHaveProperty('locale');
    expect(param(spec.paths['/prevalences'].get, 'fields').schema.items.enum).toEqual([
      'samplingYear',
      'createdAt',
      'updatedAt',
      'publishedAt',
      'locale',
    ]);
    expect(spec.components.schemas.Matrix.properties).not.toHaveProperty('locale');
  });

  it('documents 400 and 500 on find, plus 404 on findOne', () => {
    const spec = build();

    expect(Object.keys(spec.paths['/matrices'].get.responses)).toEqual(['200', '400', '500']);
    expect(Object.keys(spec.paths['/matrices/{documentId}'].get.responses)).toEqual([
      '200',
      '400',
      '404',
      '500',
    ]);
  });

  it("keeps manifest order within a group and the base's tag order across groups", () => {
    const twoTags = { ...base, tags: [{ name: 'Data' }, { name: 'Vocab' }] };
    const spec = build({
      base: twoTags,
      manifest: manifestWith({
        matrices: inApi('Vocab'),
        'resistance-tables': inApi('Data'),
        prevalences: inApi('Data'),
      }),
    });

    expect(Object.keys(spec.paths).filter((p) => !p.endsWith('}'))).toEqual([
      '/resistance-tables',
      '/prevalences',
      '/matrices',
    ]);
    expect(spec.paths['/matrices'].get.tags).toEqual(['Vocab']);
  });

  it('fails when a Public Data API type is not granted find and findOne', () => {
    expect(() =>
      build({ manifest: manifestWith({ prevalences: inApi('Data', ['find']), matrices: inApi('Data') }) }),
    ).toThrow(/prevalences.*find.*findOne/);
  });

  it('fails on Public Data API entries that name no content type or no tag', () => {
    expect(() => build({ manifest: manifestWith({ ghosts: inApi('Data') }) })).toThrow(/ghosts/);
    expect(() => build({ manifest: manifestWith({ prevalences: inApi('Nope') }) })).toThrow(/Nope/);
  });

  it('fails on attribute types it has no mapping for', () => {
    const withMedia = contentType('matrix', 'matrices', { file: { type: 'media' } });

    expect(() => build({ contentTypes: [prevalence, withMedia, isolate, table] })).toThrow(
      /matrices\.file.*media/,
    );
  });

  it('does not mutate the base', () => {
    const before = JSON.stringify(base);
    build();

    expect(JSON.stringify(base)).toBe(before);
  });
});
