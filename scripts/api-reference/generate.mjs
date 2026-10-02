// @ts-check
// Writes the Public Data API description to api-reference/openapi.json, and to
// an optional second path (for syncing the client's copy). Reads schema files
// only: no database, no Strapi boot.
//
//   yarn api-reference:generate [extra-output-path]

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import base from './base.mjs';
import { buildSpec } from './build-spec.mjs';
import config from './config.mjs';

const CMS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const OUTPUT_PATH = join(CMS_ROOT, 'api-reference', 'openapi.json');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const sortedDirs = (path) =>
  readdirSync(path, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

export function loadSchemas() {
  const contentTypes = [];
  const apiDir = join(CMS_ROOT, 'src', 'api');
  for (const api of sortedDirs(apiDir)) {
    const ctDir = join(apiDir, api, 'content-types');
    let names;
    try {
      names = sortedDirs(ctDir);
    } catch {
      continue; // an API without content types, e.g. import-admin
    }
    for (const name of names) {
      contentTypes.push({ uid: `api::${api}.${name}`, schema: readJson(join(ctDir, name, 'schema.json')) });
    }
  }

  const components = {};
  const componentsDir = join(CMS_ROOT, 'src', 'components');
  for (const category of sortedDirs(componentsDir)) {
    for (const file of readdirSync(join(componentsDir, category)).filter((f) => f.endsWith('.json')).sort()) {
      components[`${category}.${file.slice(0, -'.json'.length)}`] = readJson(join(componentsDir, category, file));
    }
  }
  return { contentTypes, components };
}

export function generate() {
  return `${JSON.stringify(buildSpec({ ...loadSchemas(), config, base }), null, 2)}\n`;
}

function main(extraOutput) {
  const json = generate();
  for (const path of [OUTPUT_PATH, ...(extraOutput ? [resolve(extraOutput)] : [])]) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, json);
    console.log(`Wrote ${path}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main(process.argv[2]);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
