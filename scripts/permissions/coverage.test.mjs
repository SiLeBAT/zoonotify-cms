// The static check from ticket 080: every content type, custom-route handler
// and content-API plugin in this CMS has an entry in config/permissions.mjs.
// Adding one without a grant decision fails CI here.
import { describe, expect, it } from 'vitest';
import manifest from '../../config/permissions.mjs';
import { coverageProblems, loadSurface } from './manifest.mjs';

describe('permission manifest coverage (real CMS source)', () => {
  const surface = loadSurface();

  it('finds the custom-route handlers next to the core routers', () => {
    expect(surface.customRoutes).toEqual([
      { handler: 'api::import-admin.import-admin.truncate', method: 'POST', path: '/import-admin/truncate' },
      { handler: 'api::import-admin.import-admin.bulkCreate', method: 'POST', path: '/import-admin/bulk-create' },
      { handler: 'api::import-admin.import-admin.recordImport', method: 'POST', path: '/import-admin/record-import' },
      { handler: 'api::isolate.isolate.import', method: 'POST', path: '/isolates/import' },
    ]);
  });

  it('finds every content type, with its kind and whether it is localized', () => {
    expect(surface.contentTypes).toHaveLength(38);
    expect(surface.contentTypes).toContainEqual({
      uid: 'api::amr-page.amr-page',
      pluralName: 'amr-pages',
      singularName: 'amr-page',
      kind: 'singleType',
      localized: true,
    });
    expect(surface.contentTypes).toContainEqual({
      uid: 'api::isolate.isolate',
      pluralName: 'isolates',
      singularName: 'isolate',
      kind: 'collectionType',
      localized: false,
    });
  });

  it('has a manifest entry for each of them, and none for anything else', () => {
    expect(coverageProblems(manifest, surface)).toEqual([]);
  });
});
