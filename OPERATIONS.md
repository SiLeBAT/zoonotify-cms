# Zoonotify CMS — Operations

Operator runbook for managing bulk surveillance data in the CMS. For domain
vocabulary see [`/CONTEXT.md`](../CONTEXT.md); for the import architecture see
[`/docs/import-cli-spec/`](../docs/import-cli-spec/README.md).

## Bulk data import (canonical workflow)

Bulk data for the **xlsx-managed collections** is loaded with the external
**Import CLI**, which talks to the CMS over the [Import admin API](./README.md#import-admin-api).
This replaces the historical "DB snapshot → restart CMS → re-import on bootstrap"
workflow, which is **retired**.

The canonical workflow is **snapshot → CLI → result**:

1. **Snapshot.** Take a database snapshot of the target environment. The import
   is a delete-then-recreate per collection with no automatic rollback (ADR
   0004), so the snapshot is your recovery point.
2. **Dry-run.** Run the CLI in `--dry-run` mode against the target. This runs
   pre-flight validation only and leaves the DB untouched. Fix every
   error-level finding before continuing; locale-completeness **warnings** are
   acceptable but should be reviewed.
3. **Import.** Run the CLI in full-import mode. It truncates and refills each
   xlsx-managed collection in batches via the Import admin API.
4. **Result.** Consume the CLI's result file — it lists per-collection counts,
   skipped DE translations, and any failures. Spot-check DB state via the
   public REST API: row counts match the workbook and a sample of relation
   lookups resolves correctly across both locales.

The CLI holds a dedicated **Import** API token (custom type) in its `.env`; see
[README → Post-deploy operator step](./README.md#post-deploy-operator-step--generate-the-import-api-token)
for how to mint it.

## Cut-off is the one remaining bootstrap-managed collection

The `resistance-table` collection (display name "AMR Cutoff Table", historically
"cut-off") is **excluded** from the Import CLI and is still imported on CMS
startup from `data/master-data/cutoff-data.xlsx`. See
[ADR 0006](../docs/import-cli-spec/adr/0006-cut-off-excluded-from-v1.md) for the
three structural reasons (multi-sheet source, hidden `antibiotic` dependency,
Strapi components instead of relations).

This bootstrap import is the **only** remaining `await import*(strapi)` call in
`src/index.ts`, and it is wrapped in `try/catch`: if `cutoff-data.xlsx` is
missing or malformed the importer logs a `[WARN]` and the CMS continues to boot.
A broken cut-off workbook no longer wedges startup — investigate via the boot
logs rather than treating it as a fire-drill.

To refresh cut-off data: place an updated `cutoff-data.xlsx` in
`data/master-data/` and restart the CMS.
