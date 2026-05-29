# Zoonotify CMS - powered by Strapi

## Naming conventions
- Content types and Single Types should all be capitalized e.g. Evaluation
- fields should all be camelCase e.g. title
- Content Type display name should be written as close to the english language as possible
- The Display name of Content types that are filled with Master Data (data received from a third party, not under our control e.g. AVV entries) should be prefixed with the letters "MD" e.g. MD Matrix
- Enumeration entries should all be uppercase e.g. HUHN


## Configuration conventions
- All Master Data Content types should have the 'Draft & Publish' feature disabled.

## Import admin API

The CMS exposes two parametric endpoints used exclusively by the external Import
CLI (see `/docs/import-cli-spec/adr/0003-cms-import-admin-api.md`):

- `POST <prefix>/import-admin/truncate { collection }` — wipes one xlsx-managed
  collection across all locales in a single DB transaction; returns per-locale
  deletion counts.
- `POST <prefix>/import-admin/bulk-create { collection, rows: [{ en, de? }] }` —
  inserts a batch in a single DB transaction; returns
  `{ rowIndex, documentId, id_en, id_de? }[]` in input order. The flat
  `matrix-detail` collection accepts plain rows with no `en`/`de` split.

`<prefix>` is the configured Strapi REST prefix (`/api` by default — confirm the
exact URL against the deployed instance).

Both endpoints accept only the 12 xlsx-managed collections; any other
`collection` value returns 400.

### Post-deploy operator step — generate the Import API token

The endpoints are gated by the `is-import-token` policy and require a dedicated
**custom** API token. After deploying this CMS, an operator must create it:

1. Open the Strapi admin panel → **Settings → API Tokens → Create new API Token**.
2. Name it `Import`, set **Token type** to **Custom**, and (optionally) an
   unlimited duration.
3. Under **Permissions**, grant **only** `Import-admin → truncate` and
   `Import-admin → bulkCreate`. Leave every other content type, Upload, Users,
   and Settings permission unchecked.
4. Copy the generated token (shown once) and deliver it securely to whoever runs
   the Import CLI; it goes in the CLI's `.env`.

A token of any other type (full-access / read-only) is rejected with 403; a
request without a token is rejected with 401.

### Smoke test (against a deployed QA instance)

```bash
# 401 — no token
curl -i -X POST "$STRAPI_URL/api/import-admin/truncate" \
  -H 'Content-Type: application/json' -d '{"collection":"microorganism"}'

# 400 — collection off the allow-list
curl -i -X POST "$STRAPI_URL/api/import-admin/truncate" \
  -H "Authorization: Bearer $IMPORT_TOKEN" \
  -H 'Content-Type: application/json' -d '{"collection":"isolate"}'

# 200 — truncate then bulk-create a microorganism batch
curl -i -X POST "$STRAPI_URL/api/import-admin/truncate" \
  -H "Authorization: Bearer $IMPORT_TOKEN" \
  -H 'Content-Type: application/json' -d '{"collection":"microorganism"}'

curl -i -X POST "$STRAPI_URL/api/import-admin/bulk-create" \
  -H "Authorization: Bearer $IMPORT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"collection":"microorganism","rows":[{"en":{"name":"Salmonella"},"de":{"name":"Salmonellen"}}]}'
```

