import { describe, it, expect } from 'vitest';
import createService from './import-admin';

/**
 * A minimal in-memory Strapi double: a per-uid row store the Document Service
 * mutates, plus the `contentType` schema lookup and the `db.query` engine
 * (`findMany`/`deleteMany`) the idempotency path reads and writes. Each
 * `documents().create` mints a fresh documentId; `update` attaches a locale row
 * to it; `deleteMany({ where })` drops every row matching all `where` keys.
 */
function fakeStrapi(schemas: Record<string, Record<string, { type?: string; unique?: boolean }>>) {
  const store = new Map<string, Array<{ documentId: string; locale: string; [k: string]: unknown }>>();
  const purged: Array<{ uid: string; where: Record<string, unknown> }> = [];
  let nextId = 1;

  const rows = (uid: string) => store.get(uid) ?? (store.set(uid, []), store.get(uid)!);
  const matches = (r: Record<string, unknown>, where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) => r[k] === v);

  const strapi = {
    contentType: (uid: string) => ({ attributes: schemas[uid] ?? {} }),
    db: {
      query: (uid: string) => ({
        findMany: async ({ where }: { where: Record<string, unknown> }) =>
          rows(uid).filter((r) => matches(r, where)),
        deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
          purged.push({ uid, where });
          const before = rows(uid).length;
          store.set(uid, rows(uid).filter((r) => !matches(r, where)));
          return { count: before - rows(uid).length };
        },
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
    }),
  };

  return { strapi, store, purged };
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
  it('purges a pre-existing row on a unique field before recreating it', async () => {
    const { strapi, store, purged } = fakeStrapi(SCHEMAS);
    // Simulate a partially-applied prior attempt: the EN row for dbId "X" landed,
    // the DE localization never did. A naive retry would 400 on the unique dbId.
    store.set(RESISTANCE, [{ documentId: 'stale-1', locale: 'en', id: 99, dbId: 'X' }]);

    const svc = createService({ strapi } as never);
    const created = await svc.bulkCreate('resistance', [row('X', { resistenzrate: 0.5 })]);

    // The stale half-applied row was deleted by dbId, then a fresh document created.
    expect(purged).toContainEqual({ uid: RESISTANCE, where: { dbId: 'X' } });
    expect(store.get(RESISTANCE)!.some((r) => r.documentId === 'stale-1')).toBe(false);
    expect(created).toHaveLength(1);
    expect(created[0].id_de).toBeDefined();
    // Exactly one document carries dbId "X" now (the new one), across two locales.
    const remaining = store.get(RESISTANCE)!.filter((r) => r.dbId === 'X');
    expect(new Set(remaining.map((r) => r.documentId))).toEqual(new Set([created[0].documentId]));
    expect(remaining.map((r) => r.locale).sort()).toEqual(['de', 'en']);
  });

  it('creates both rows on a clean (post-truncate) table, purging nothing', async () => {
    const { strapi, store } = fakeStrapi(SCHEMAS);
    const svc = createService({ strapi } as never);

    const created = await svc.bulkCreate('resistance', [row('A'), row('B')]);

    expect(created).toHaveLength(2);
    // Two documents, each with an en + de row, and nothing left over.
    expect(store.get(RESISTANCE)!).toHaveLength(4);
    expect(new Set(store.get(RESISTANCE)!.map((r) => r.dbId))).toEqual(new Set(['A', 'B']));
  });

  it('skips the purge for collections with no unique attribute (e.g. prevalence)', async () => {
    const { strapi, store, purged } = fakeStrapi(SCHEMAS);
    // A row already carrying dbId "P" must NOT be deleted — prevalence.dbId is not unique.
    store.set(PREVALENCE, [{ documentId: 'keep-1', locale: 'en', id: 7, dbId: 'P' }]);

    const svc = createService({ strapi } as never);
    await svc.bulkCreate('prevalence', [row('P', { numberOfSamples: 3 })]);

    // No deleteMany was issued (no unique attr to key on), so the prior row survives.
    expect(purged).toHaveLength(0);
    expect(store.get(PREVALENCE)!.some((r) => r.documentId === 'keep-1')).toBe(true);
  });
});
