/**
 * import-admin service
 *
 * Backs the two Import admin API endpoints. Each operation runs inside a single
 * DB transaction so a wipe or a batch of inserts either lands fully or not at all
 * (see ADR 0003 and CONTEXT.md § Atomicity scope).
 *
 * The collection allow-list and locale-payload shaping live in ./lib and are
 * unit-tested in isolation; this service is the thin Strapi adapter over them and
 * is verified by the manual curl smoke test in the issue's acceptance criteria.
 */

import { resolveCollection } from '../lib/collection-allow-list';
import { toLocalePayloads } from '../lib/locale-payloads';

type DeletionCounts = Record<string, number>;

interface BulkCreateResult {
  rowIndex: number;
  documentId: string;
  id_en: number;
  id_de?: number;
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Wipe a single xlsx-managed collection across all locales in one transaction.
   * Returns the number of rows deleted, keyed by locale.
   */
  async truncate(collection: string): Promise<DeletionCounts> {
    const { uid } = resolveCollection(collection);

    return strapi.db.transaction(async () => {
      const rows: Array<{ locale: string | null }> = await strapi.db
        .query(uid)
        .findMany({ select: ['id', 'locale'] });

      const counts: DeletionCounts = {};
      for (const row of rows) {
        const locale = row.locale ?? 'en';
        counts[locale] = (counts[locale] ?? 0) + 1;
      }

      await strapi.db.query(uid).deleteMany({ where: {} });

      return counts;
    });
  },

  /**
   * Insert a batch of rows in one transaction. Rows arrive with relation fields
   * already resolved to integer IDs by the CLI. Returns IDs in input order.
   */
  async bulkCreate(
    collection: string,
    rows: Array<Record<string, unknown>>,
  ): Promise<BulkCreateResult[]> {
    const { uid, localized } = resolveCollection(collection);

    return strapi.db.transaction(async () => {
      const results: BulkCreateResult[] = [];

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const { base, translation } = toLocalePayloads(localized, rows[rowIndex]);

        const created = localized
          ? await strapi.documents(uid).create({ data: base, locale: 'en' })
          : await strapi.documents(uid).create({ data: base });

        const result: BulkCreateResult = {
          rowIndex,
          documentId: created.documentId,
          id_en: created.id,
        };

        if (localized && translation) {
          const localized_de = await strapi.documents(uid).update({
            documentId: created.documentId,
            locale: 'de',
            data: translation,
          });
          result.id_de = localized_de.id;
        }

        results.push(result);
      }

      return results;
    });
  },
});
