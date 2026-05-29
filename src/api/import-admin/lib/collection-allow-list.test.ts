import { describe, it, expect } from 'vitest';
import { resolveCollection, UnknownCollectionError } from './collection-allow-list';

describe('resolveCollection', () => {
  it('resolves a localized xlsx-managed collection to its UID', () => {
    expect(resolveCollection('microorganism')).toEqual({
      uid: 'api::microorganism.microorganism',
      localized: true,
    });
  });

  it('resolves matrix-detail as a flat (non-localized) collection', () => {
    expect(resolveCollection('matrix-detail')).toEqual({
      uid: 'api::matrix-detail.matrix-detail',
      localized: false,
    });
  });

  it('throws UnknownCollectionError for a name off the allow-list', () => {
    expect(() => resolveCollection('isolate')).toThrow(UnknownCollectionError);
  });

  it.each(['resistance-table', 'controlled-vocabulary', 'salmonella'])(
    'rejects deliberately-excluded content type %s',
    (excluded) => {
      expect(() => resolveCollection(excluded)).toThrow(UnknownCollectionError);
    },
  );

  it.each([
    ['matrix', 'api::matrix.matrix', true],
    ['matrix-group', 'api::matrix-group.matrix-group', true],
    ['matrix-detail', 'api::matrix-detail.matrix-detail', false],
    ['microorganism', 'api::microorganism.microorganism', true],
    ['specie', 'api::specie.specie', true],
    ['antimicrobial-substance', 'api::antimicrobial-substance.antimicrobial-substance', true],
    ['sample-type', 'api::sample-type.sample-type', true],
    ['sample-origin', 'api::sample-origin.sample-origin', true],
    ['super-category-sample-origin', 'api::super-category-sample-origin.super-category-sample-origin', true],
    ['sampling-stage', 'api::sampling-stage.sampling-stage', true],
    ['resistance', 'api::resistance.resistance', true],
    ['prevalence', 'api::prevalence.prevalence', true],
  ] as const)('resolves xlsx-managed collection %s', (name, uid, localized) => {
    expect(resolveCollection(name)).toEqual({ uid, localized });
  });
});
