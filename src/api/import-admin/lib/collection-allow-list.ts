export interface ResolvedCollection {
  /** Strapi content-type UID, e.g. `api::microorganism.microorganism`. */
  uid: string;
  /** Whether the collection is i18n-localized (`{ en, de? }`) or flat. */
  localized: boolean;
}

/** Thrown when a collection name is not on the xlsx-managed allow-list. */
export class UnknownCollectionError extends Error {
  constructor(name: string) {
    super(`Collection "${name}" is not an xlsx-managed collection`);
    this.name = 'UnknownCollectionError';
  }
}

/**
 * The 12 xlsx-managed collections, the only ones the Import CLI may wipe and
 * refill. `matrix-detail` is the sole flat (non-i18n) collection; every other
 * collection is localized and follows the `{ en, de? }` row shape.
 * See CONTEXT.md § xlsx-managed collection and ADR 0003.
 */
const ALLOW_LIST: Record<string, ResolvedCollection> = {
  matrix: { uid: 'api::matrix.matrix', localized: true },
  'matrix-group': { uid: 'api::matrix-group.matrix-group', localized: true },
  'matrix-detail': { uid: 'api::matrix-detail.matrix-detail', localized: false },
  microorganism: { uid: 'api::microorganism.microorganism', localized: true },
  specie: { uid: 'api::specie.specie', localized: true },
  'antimicrobial-substance': {
    uid: 'api::antimicrobial-substance.antimicrobial-substance',
    localized: true,
  },
  'sample-type': { uid: 'api::sample-type.sample-type', localized: true },
  'sample-origin': { uid: 'api::sample-origin.sample-origin', localized: true },
  'super-category-sample-origin': {
    uid: 'api::super-category-sample-origin.super-category-sample-origin',
    localized: true,
  },
  'sampling-stage': { uid: 'api::sampling-stage.sampling-stage', localized: true },
  resistance: { uid: 'api::resistance.resistance', localized: true },
  prevalence: { uid: 'api::prevalence.prevalence', localized: true },
};

export function resolveCollection(name: string): ResolvedCollection {
  const resolved = ALLOW_LIST[name];
  if (!resolved) {
    throw new UnknownCollectionError(name);
  }
  return resolved;
}
