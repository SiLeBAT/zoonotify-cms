export interface LocalePayloads {
  /** The base record, created in the `en` locale (or the only record, for flat collections). */
  base: Record<string, unknown>;
  /** Optional `de` localization, attached to the base document under the same documentId. */
  translation?: Record<string, unknown>;
}

/** Thrown when a localized row has no `en` base payload. */
export class MissingBaseLocaleError extends Error {
  constructor() {
    super('Localized row is missing its required "en" payload');
    this.name = 'MissingBaseLocaleError';
  }
}

export function toLocalePayloads(localized: boolean, row: any): LocalePayloads {
  if (!localized) {
    // Flat collections (matrix-detail) carry no en/de split. The CLI still wraps
    // the record under `en` (its rows are always `{ en, de? }`), so unwrap it;
    // tolerate a already-flat row too.
    return { base: row?.en ?? row };
  }
  if (!row.en) {
    throw new MissingBaseLocaleError();
  }
  const payloads: LocalePayloads = { base: row.en };
  if (row.de) {
    payloads.translation = row.de;
  }
  return payloads;
}
