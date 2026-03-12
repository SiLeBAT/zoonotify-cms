# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn develop        # Start in development mode (with auto-reload and admin panel)
yarn start          # Start in production mode
yarn build          # Build the admin panel
yarn key-gen        # Generate new Strapi secrets for .env (APP_KEYS, JWT secrets, etc.)
```

No test framework is configured — the CI workflow installs dependencies but does not run tests.

## Architecture Overview

This is a **Strapi v5 CMS** serving as the backend for the Zoonotify application (zoonotic disease surveillance data from BfR Germany). It uses **PostgreSQL** in production and SQLite locally (controlled by `DATABASE_CLIENT` env var).

### Data Flow

The primary purpose beyond content management is **bulk data import** from Excel files into Strapi's database. The import pipeline runs on Strapi bootstrap (defined in `src/index.ts`):

1. Excel files are placed in `data/master-data/` (e.g., `ZooNotify_DB.xlsx`, `prevalence.xlsx`)
2. Import functions in `src/data_import/` read the Excel files and upsert records via Strapi's entity service
3. Import results are written to JSON log files in `data/` (e.g., `resistances-import-result.json`)

The main data types are **Prevalence** (from `prevalence.xlsx`) and **Resistance** (from `ZooNotify_DB.xlsx`, sheet `amr_resrate`). Most other imports handle reference/lookup data (Matrix, Microorganism, SampleType, etc.).

Import scripts use two Excel libraries: `exceljs` (resistance/AMR imports) and `node-xlsx` (everything else). Resistance imports use `p-limit` for concurrency control.

#### Upload-Triggered Imports

The file upload lifecycle (`src/extensions/upload/content-types/file/lifecycles.ts`) triggers additional imports on `afterCreate` based on the upload folder name:
- `Prevalence` — re-imports prevalence data from the uploaded Excel file
- `evaluation-en` / `evaluation-de` — links uploaded diagrams/CSV files to matching `Evaluation` records by filename; moves old files to an `Archive` folder
- `Cutt_Off` — re-imports cut-off data from the uploaded Excel file

#### Strapi v5 i18n Linking Pattern

When creating German locale records during import, the code uses a raw Knex query to align the `document_id` column with the English entry's `documentId`. This is required because Strapi v5 links i18n locales via a shared `document_id`. Example from `importResistances`:
```ts
await strapi.db.connection('resistance_tables')
  .where({ id: deEntry.id })
  .update({ document_id: enEntry.documentId });
```

#### Strapi API Usage

Two Strapi data access APIs are used (sometimes mixed within the same file):
- `strapi.documents(uid)` — preferred Strapi v5 Document Service API
- `strapi.entityService` — older v4-style API (still present in some import scripts)

### Key Directories

- `src/api/` — Strapi content types (controllers, services, routes, content-type schemas). Most use the default Strapi factory (core controller/service). **Exception:** `isolate` has a custom `import` action (POST `/api/isolates/import`) that parses an uploaded Excel file via `node-xlsx` and upserts records using `mapAllSettled` workers.
- `src/data_import/` — Import scripts, one per content type. Called during bootstrap in `src/index.ts`.
- `src/extensions/` — Strapi extensions: custom file upload lifecycle (`upload/content-types/file/lifecycles.ts`) and a helper with async worker utilities (`helper.ts`).
- `src/middlewares/version-injector.ts` — Adds `cms-version` response header (reads from `package.json`).
- `config/` — Strapi configuration: database, plugins (documentation + nodemailer email), middlewares.
- `data/master-data/` — Excel source files for import (not committed; placed on server manually).

### Naming Conventions (from README)

- Content types and Single Types: PascalCase (e.g., `Evaluation`)
- Fields: camelCase (e.g., `title`)
- Enumeration values: UPPERCASE (e.g., `HUHN`)
- Master Data content types (data from third parties, e.g., AVV entries): prefixed with `MD` (e.g., `MD Matrix`)
- Master Data content types should have **Draft & Publish disabled**

### Internationalization

Content is stored in both **English** (default locale) and **German**. Import scripts create English records first, then create linked German records using the same `documentId`.

### Deployment

- Deployed via PM2 using `ecosystem.config.js`
- CI runs on `develop` branch (installs deps + builds)
- CD deploys to QA server via SSH on push to `develop`
- The `deploy.sh` script handles `yarn install --frozen-lockfile && yarn build` + PM2 reload
- Uploads are persisted outside the app directory via a symlink at `public/uploads`

### Environment Variables

Copy `.env.example` to `.env`. Required secrets (generate with `yarn key-gen`):
- `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `JWT_SECRET`
- `DATABASE_CLIENT` (default: `sqlite`; use `postgres` in production)
- `DATABASE_*` — connection details for PostgreSQL
- `SMTP_*` — for nodemailer email plugin
