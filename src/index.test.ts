import { afterEach, describe, expect, it, vi } from 'vitest';

// The bootstrap importer for cut-off is the one collection still imported on
// CMS boot (ADR 0006). Everything else moved to the external Import CLI.
// We mock it so we can drive its failure path without touching xlsx/db.
vi.mock('./data_import/cut-off.import', () => ({
  importCutOffData: vi.fn().mockRejectedValue(new Error('boom')),
}));

import app from './index';

describe('CMS bootstrap', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('boots without throwing when the cut-off import fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(app.bootstrap({ strapi: {} as any })).resolves.toBeUndefined();

    const warnText = warnSpy.mock.calls.flat().join(' ');
    expect(warnText).toContain('boom');
  });
});
