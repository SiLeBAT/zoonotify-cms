/**
 * import-admin service
 *
 * Backs the two Import admin API endpoints. `truncate` runs in a single DB
 * transaction (an all-or-nothing wipe). `bulkCreate` does NOT wrap the batch in a
 * transaction: creating an EN entry and then attaching its DE localization must go
 * through the Document Service (the only way Strapi v5 registers a localization —
 * a raw row sharing a document_id is not recognized), and the Document Service's
 * cross-locale operations cannot see an uncommitted base document inside an open
 * `strapi.db.transaction`. Per-batch atomicity is therefore traded for correct
 * localizations; the CLI already treats a failed run as partial state and relies
 * on a pre-run snapshot (exit 4, ADR 0004). See ADR 0003 / CONTEXT.md § Atomicity.
 *
 * The collection allow-list and locale-payload shaping live in ./lib and are
 * unit-tested in isolation; this service is the thin Strapi adapter over them.
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

    // No wrapping transaction: the Document Service must create the EN entry and
    // then attach the DE localization to the same document, and the second call
    // cannot see the first while it is still uncommitted inside a transaction.
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
        // Attach the DE locale to the same document via the Document Service so
        // Strapi registers it as a localization (a raw row is not recognized).
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
  },
});
