import { describe, it, expect } from 'vitest';
import createService from './import-admin';

/**
 * A minimal in-memory Strapi double: a per-uid row store the Document Service
 * mutates, plus the `contentType` schema lookup and `db.query` the idempotency
 * path reads. Each `documents().create` mints a fresh documentId; `update`
 * attaches a locale row to it; `delete` drops every locale row of a document.
 */
function fakeStrapi(schemas: Record<string, Record<string, { type?: string; unique?: boolean }>>) {
  const store = new Map<string, Array<{ documentId: string; locale: string; [k: string]: unknown }>>();
  const deleted: Array<{ uid: string; documentId: string }> = [];
  let nextId = 1;

  const rows = (uid: string) => store.get(uid) ?? (store.set(uid, []), store.get(uid)!);

  const strapi = {
    contentType: (uid: string) => ({ attributes: schemas[uid] ?? {} }),
    db: {
      query: (uid: string) => ({
        findMany: async ({ where }: { select?: string[]; where: Record<string, unknown> }) =>
          rows(uid).filter((r) => Object.entries(where).every(([k, v]) => r[k] === v)),
      }),
    },
    documents: (uid: string) => ({
      create: async ({ data, locale }: { data: Record<string, unknown>; locale?: string }) => {
        const documentId = `doc-${nextId}`;
        const id = nextId++;
        rows(uid).push({ documentId, locale: locale ?? 'en', id, ...data });
        return { documentId, id };
      },
      update: async ({
        documentId,
        locale,
        data,
      }: {
        documentId: string;
        locale: string;
        data: Record<string, unknown>;
      }) => {
        const id = nextId++;
        rows(uid).push({ documentId, locale, id, ...data });
        return { documentId, id };
      },
      delete: async ({ documentId }: { documentId: string }) => {
        deleted.push({ uid, documentId });
        store.set(uid, rows(uid).filter((r) => r.documentId !== documentId));
      },
    }),
  };

  return { strapi, store, deleted };
}

const RESISTANCE = 'api::resistance.resistance';
const PREVALENCE = 'api::prevalence.prevalence';

// Mirrors the live schemas: resistance.dbId is unique, prevalence.dbId is not.
const SCHEMAS = {
  [RESISTANCE]: { dbId: { type: 'string', unique: true }, resistenzrate: { type: 'float' } },
  [PREVALENCE]: { dbId: { type: 'string' }, numberOfSamples: { type: 'integer' } },
};

function row(dbId: string, extra: Record<string, unknown> = {}) {
  return { en: { dbId, ...extra }, de: { dbId, ...extra } };
}

describe('import-admin bulkCreate — idempotent replay', () => {
  it('deletes a pre-existing document on a unique field before recreating it', async () => {
    const { strapi, store, deleted } = fakeStrapi(SCHEMAS);
    // Simulate a partially-applied prior attempt: the EN row for dbId "X" landed,
    // the DE localization never did. A naive retry would 400 on the unique dbId.
    store.set(RESISTANCE, [{ documentId: 'stale-1', locale: 'en', id: 99, dbId: 'X' }]);

    const svc = createService({ strapi } as never);
    const created = await svc.bulkCreate('resistance', [row('X', { resistenzrate: 0.5 })]);

    // The stale half-applied document was purged, then a fresh one created.
    expect(deleted).toEqual([{ uid: RESISTANCE, documentId: 'stale-1' }]);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ rowIndex: 0 });
    expect(created[0].id_de).toBeDefined();
    // Exactly one document carries dbId "X" now (the new one), across two locales.
    const remaining = store.get(RESISTANCE)!.filter((r) => r.dbId === 'X');
    expect(new Set(remaining.map((r) => r.documentId))).toEqual(new Set([created[0].documentId]));
    expect(remaining.map((r) => r.locale).sort()).toEqual(['de', 'en']);
  });

  it('does not delete anything on a clean (post-truncate) table', async () => {
    const { strapi, deleted } = fakeStrapi(SCHEMAS);
    const svc = createService({ strapi } as never);

    await svc.bulkCreate('resistance', [row('A'), row('B')]);

    expect(deleted).toEqual([]);
  });

  it('skips the purge for collections with no unique attribute (e.g. prevalence)', async () => {
    const { strapi, store, deleted } = fakeStrapi(SCHEMAS);
    // A row already carrying dbId "P" must NOT be deleted — prevalence.dbId is not unique.
    store.set(PREVALENCE, [{ documentId: 'keep-1', locale: 'en', id: 7, dbId: 'P' }]);

    const svc = createService({ strapi } as never);
    await svc.bulkCreate('prevalence', [row('P', { numberOfSamples: 3 })]);

    expect(deleted).toEqual([]);
    expect(store.get(PREVALENCE)!.some((r) => r.documentId === 'keep-1')).toBe(true);
  });
});
