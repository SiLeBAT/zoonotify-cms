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
   * Insert a batch of rows. Rows arrive with relation fields already resolved to
   * integer IDs by the CLI. Returns IDs in input order.
   */
  async bulkCreate(
    collection: string,
    rows: Array<Record<string, unknown>>,
  ): Promise<BulkCreateResult[]> {
    const { uid, localized } = resolveCollection(collection);

    // No wrapping transaction: the Document Service must create the EN entry and
    // then attach the DE localization to the same document, and the second call
    // cannot see the first while it is still uncommitted inside a transaction.
    //
    // That makes a batch non-atomic: if the request times out or drops mid-flight,
    // some rows are already committed. The CLI classifies such failures as
    // retryable and re-sends the *whole* batch, so any `unique` attribute (e.g.
    // resistance `dbId`) would collide on the rows that did land. To keep a batch
    // safely replayable we make each row idempotent: before creating it, delete
    // any existing document carrying this row's unique value(s). On the normal
    // post-truncate path the table is empty, so this is a cheap indexed lookup
    // that finds nothing; only a retry after a partial apply does real work.
    const uniqueAttrs = uniqueAttributesOf(strapi, uid);
    const results: BulkCreateResult[] = [];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const { base, translation } = toLocalePayloads(localized, rows[rowIndex]);

      await purgeConflictingDocuments(strapi, uid, uniqueAttrs, base);

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

/**
 * The names of a content type's scalar `unique` attributes — the ones a replayed
 * batch could collide on. Relations are excluded (uniqueness there is structural,
 * not a value the CLI sends). Read from the live schema so a future `unique` flag
 * is picked up without touching this code.
 */
function uniqueAttributesOf(strapi: any, uid: string): string[] {
  const attributes: Record<string, { type?: string; unique?: boolean }> =
    strapi.contentType(uid)?.attributes ?? {};
  return Object.entries(attributes)
    .filter(([, def]) => def?.unique === true && def.type !== 'relation')
    .map(([name]) => name);
}

/**
 * Delete any document(s) that already carry one of this row's unique values, so
 * the row can be (re)created without a unique-constraint collision. A localized
 * unique value is shared across a document's locales, so a single document-level
 * delete clears every locale — the query-engine lookup sees all locale rows and
 * we de-duplicate by `documentId`. Deleting through the Document Service (not a
 * raw row delete) keeps localization/relation metadata consistent.
 */
async function purgeConflictingDocuments(
  strapi: any,
  uid: string,
  uniqueAttrs: string[],
  base: Record<string, unknown>,
): Promise<void> {
  const seen = new Set<string>();
  for (const attr of uniqueAttrs) {
    const value = base[attr];
    if (value === undefined || value === null) {
      continue;
    }
    const existing: Array<{ documentId?: string }> = await strapi.db
      .query(uid)
      .findMany({ select: ['documentId'], where: { [attr]: value } });
    for (const { documentId } of existing) {
      if (documentId && !seen.has(documentId)) {
        seen.add(documentId);
        await strapi.documents(uid).delete({ documentId });
      }
    }
  }
}
