// @ts-check
// Checks that every collection the Public Data API promises answers an
// anonymous GET with 200. Public-role grants live in the database, so only a
// live request sees them. Readable-but-unpromised routes are not checked.
//
//   yarn api-reference:probe [baseUrl] [--wait <seconds>] [--report <file>]
//
// baseUrl defaults to the spec's server (prod). --wait keeps retrying failing
// collections for that long (e.g. while the CMS boots after a deploy).
// --report writes a markdown summary, used for the failure issue.

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import base from './base.mjs';
import config from './config.mjs';

const REQUEST_TIMEOUT_MS = 30_000;

/** @param {{ include: Record<string, string[]> }} cfg */
export const promisedCollections = (cfg) => Object.values(cfg.include).flat();

/**
 * @param {{
 *   baseUrl: string,
 *   collections: string[],
 *   fetch?: (url: string, init: any) => Promise<{ status: number }>,
 *   waitMs?: number,
 *   intervalMs?: number,
 *   sleep?: (ms: number) => Promise<void>,
 *   now?: () => number,
 * }} options
 * @returns {Promise<{ collection: string, url: string, status: number | string }[]>} the failures
 */
export async function probe({
  baseUrl,
  collections,
  fetch = globalThis.fetch,
  waitMs = 0,
  intervalMs = 15_000,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  now = Date.now,
}) {
  const root = baseUrl.replace(/\/+$/, '');
  const deadline = now() + waitMs;
  let pending = collections;
  let failures = [];

  for (;;) {
    failures = [];
    for (const collection of pending) {
      const url = `${root}/${collection}?pagination[pageSize]=1`;
      const status = await statusOf(fetch, url);
      if (status !== 200) failures.push({ collection, url, status });
    }
    if (failures.length === 0 || now() + intervalMs > deadline) return failures;
    await sleep(intervalMs);
    pending = failures.map((f) => f.collection);
  }
}

async function statusOf(fetch, url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return res.status;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

export function formatReport(baseUrl, failures) {
  if (failures.length === 0) {
    return `All promised Public Data API collections returned 200 at ${baseUrl}.\n`;
  }
  return [
    `The anonymous probe of ${baseUrl} found ${failures.length} promised collection(s) not returning 200.`,
    'Public-role grants or the deployment have drifted from the documented Public Data API.',
    '',
    '| Collection | Status |',
    '|---|---|',
    ...failures.map((f) => `| \`${f.collection}\` | ${f.status} |`),
    '',
  ].join('\n');
}

function parseArgs(argv) {
  const args = { baseUrl: base.servers[0].url, waitMs: 0, report: undefined };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--wait') args.waitMs = Number(argv[++i]) * 1000;
    else if (arg === '--report') args.report = argv[++i];
    else if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}`);
    else args.baseUrl = arg;
  }
  if (!Number.isFinite(args.waitMs) || args.waitMs < 0) throw new Error('--wait needs a number of seconds');
  return args;
}

async function main(argv) {
  const { baseUrl, waitMs, report } = parseArgs(argv);
  const collections = promisedCollections(config);
  console.log(`Probing ${collections.length} collections at ${baseUrl}`);

  const failures = await probe({ baseUrl, collections, waitMs });
  const summary = formatReport(baseUrl, failures);
  if (report) writeFileSync(report, summary);

  if (failures.length) {
    for (const f of failures) console.error(`FAIL ${f.collection}: ${f.status} (${f.url})`);
    process.exitCode = 1;
  } else {
    console.log(summary.trim());
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
