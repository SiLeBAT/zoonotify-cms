import { describe, expect, it } from 'vitest';
import { coverageProblems } from './manifest.mjs';

const surface = {
  contentTypes: [
    { uid: 'api::prevalence.prevalence', pluralName: 'prevalences', singularName: 'prevalence', kind: 'collectionType', localized: true },
    { uid: 'api::welcome.welcome', pluralName: 'welcomes', singularName: 'welcome', kind: 'singleType', localized: true },
  ],
  customRoutes: [{ handler: 'api::isolate.isolate.import', method: 'POST', path: '/isolates/import' }],
  plugins: ['users-permissions', 'upload'],
};

const entry = (actions, extra = {}) => ({ actions, consumers: [], reason: 'test', ...extra });

const manifest = (overrides = {}) => ({
  locales: ['de', 'en'],
  public: {
    contentTypes: {
      prevalences: entry(['find', 'findOne'], { consumers: ['client'] }),
      welcomes: entry(['find'], { consumers: ['client'] }),
    },
    customRoutes: {
      'api::isolate.isolate.import': entry([], { method: 'POST', path: '/isolates/import' }),
    },
    plugins: { 'users-permissions': entry([]), upload: entry([]) },
    ...overrides,
  },
  authenticated: { actions: [] },
  roles: ['Public', 'Authenticated'],
  signUps: false,
  importToken: { name: 'Import', type: 'custom', actions: [] },
});

describe('coverageProblems', () => {
  it('finds nothing when every content type, custom route and plugin has an entry', () => {
    expect(coverageProblems(manifest(), surface)).toEqual([]);
  });

  it('reports a content type added without an entry', () => {
    const withNewType = {
      ...surface,
      contentTypes: [
        ...surface.contentTypes,
        { uid: 'api::isolate.isolate', pluralName: 'isolates', singularName: 'isolate', kind: 'collectionType', localized: false },
      ],
    };

    expect(coverageProblems(manifest(), withNewType)).toEqual([
      'content type isolates has no manifest entry',
    ]);
  });

  it('reports a custom route added without an entry', () => {
    const withNewRoute = {
      ...surface,
      customRoutes: [
        ...surface.customRoutes,
        { handler: 'api::import-admin.import-admin.truncate', method: 'POST', path: '/import-admin/truncate' },
      ],
    };

    expect(coverageProblems(manifest(), withNewRoute)).toEqual([
      'custom route POST /import-admin/truncate (api::import-admin.import-admin.truncate) has no manifest entry',
    ]);
  });

  it('reports a content-API plugin without an entry', () => {
    const m = manifest({ plugins: { upload: entry([]) } });

    expect(coverageProblems(m, surface)).toEqual(['plugin users-permissions has no manifest entry']);
  });

  it('reports entries that name nothing in the CMS', () => {
    const m = manifest();
    m.public.contentTypes.ghosts = entry([]);
    m.public.customRoutes['api::ghost.ghost.haunt'] = entry([], { method: 'POST', path: '/ghosts/haunt' });
    m.public.plugins.graphql = entry([]);

    expect(coverageProblems(m, surface)).toEqual([
      'manifest entry ghosts names no content type',
      'manifest entry api::ghost.ghost.haunt names no custom route',
      'manifest entry graphql names no content-API plugin',
    ]);
  });

  it('reports actions the entry cannot have', () => {
    const m = manifest();
    m.public.contentTypes.welcomes = entry(['find', 'findOne'], { consumers: ['client'] });
    m.public.contentTypes.prevalences = entry(['find', 'fnd'], { consumers: ['client'] });
    m.public.customRoutes['api::isolate.isolate.import'] = entry(['truncate'], {
      method: 'POST',
      path: '/isolates/import',
    });

    expect(coverageProblems(m, surface)).toEqual([
      'prevalences grants unknown action fnd (a collectionType has find, findOne, create, update, delete)',
      'welcomes grants unknown action findOne (a singleType has find, update, delete)',
      'api::isolate.isolate.import grants unknown action truncate (a custom route has import)',
    ]);
  });
});
