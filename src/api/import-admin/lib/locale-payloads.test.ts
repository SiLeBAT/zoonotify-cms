import { describe, it, expect } from 'vitest';
import { toLocalePayloads, MissingBaseLocaleError } from './locale-payloads';

describe('toLocalePayloads', () => {
  it('splits a localized row into base (en) and translation (de)', () => {
    const row = { en: { name: 'Salmonella' }, de: { name: 'Salmonellen' } };
    expect(toLocalePayloads(true, row)).toEqual({
      base: { name: 'Salmonella' },
      translation: { name: 'Salmonellen' },
    });
  });

  it('omits translation when a localized row has only en', () => {
    const row = { en: { name: 'Salmonella' } };
    expect(toLocalePayloads(true, row)).toStrictEqual({ base: { name: 'Salmonella' } });
  });

  it('throws when a localized row is missing the en base', () => {
    expect(() => toLocalePayloads(true, { de: { name: 'Salmonellen' } })).toThrow(
      MissingBaseLocaleError,
    );
  });

  it('treats a flat (non-localized) row as the whole base payload', () => {
    const row = { name: 'Caecum', iri: 'http://example.org/caecum' };
    expect(toLocalePayloads(false, row)).toStrictEqual({ base: row });
  });
});
