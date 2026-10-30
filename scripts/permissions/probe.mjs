// @ts-check
// Checks a live host against the permission manifest (config/permissions.mjs).
//
//   yarn permissions:probe <baseUrl> [--report <file>] [--wait <seconds>]
//
// baseUrl is required (e.g. http://127.0.0.1:1337/api; use 127.0.0.1, not
// localhost, on Windows), so a local run never hits prod by accident.
// --report writes the full Markdown report. --wait keeps retrying checks that
// failed as `error` or `not deployed` (a host still booting, or an old process)
// for that long; every other failure is reported at once.
//
// Prints one counts line when everything passes. Otherwise one FAIL line per
// failure on stderr and exit code 1. Requests are anonymous, sequential, about
// 250 ms apart, with a 30 s timeout.
//
// The checks come from halves that each turn the manifest into `Check`s
// yielding `Failure` rows of the same shape: probe-anonymous.mjs now; an admin
// half reading exact grant sets plugs into `checkHalves` below the same way.

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import defaultManifest from '../../config/permissions.mjs';
import { anonymousChecks, anonymousNotProbed } from './probe-anonymous.mjs';
import { loadSurface } from './manifest.mjs';

/**
 * @typedef {{ status: number | null, name?: string, message?: string, failure?: string }} Answer
 *   status null = no HTTP answer (`failure` says why: timeout, connection refused …).
 * @typedef {{ request: (method: string, path: string, body?: unknown) => Promise<Answer> }} Http
 * @typedef {{
 *   category: 'leak' | 'drift' | 'not deployed' | 'missing content' | 'error',
 *   target: string, action: string, locale: string | null,
 *   expected: string, got: string, consumers: string[],
 * }} Failure
 * @typedef {{ id: string, run: (http: Http) => Promise<Failure[]> }} Check
 * @typedef {{ target: string, action: string, reason: string }} NotProbed
 * @typedef {{
 *   fetch?: (url: string, init: any) => Promise<Response>,
 *   now?: () => number,
 *   sleep?: (ms: number) => Promise<void>,
 *   writeFile?: (path: string, text: string) => void,
 *   stdout?: (line: string) => void,
 *   stderr?: (line: string) => void,
 *   manifest?: any,
 *   surface?: import('./manifest.mjs').Surface,
 * }} Deps
 */

/** Severity order: the report and the FAIL lines are sorted by it. */
export const CATEGORIES = /** @type {const} */ (['leak', 'drift', 'not deployed', 'missing content', 'error']);
/** Only these can heal by waiting (a booting host, an old process still answering). */
const RETRIED = new Set(['error', 'not deployed']);

const PACING_MS = 250;
const TIMEOUT_MS = 30_000;
const RETRY_INTERVAL_MS = 15_000;

/**
 * The checks and the "not probed" list of each half. The admin half (exact
 * grant sets through PERMISSIONS_READER_TOKEN) belongs here.
 *
 * @param {{ manifest: any, surface: import('./manifest.mjs').Surface }} options
 * @returns {{ checks: Check[], notProbed: NotProbed[] }[]}
 */
const checkHalves = (options) => [{ checks: anonymousChecks(options), notProbed: anonymousNotProbed(options) }];

/**
 * Anonymous HTTP against the base URL: one request at a time, paced, with a
 * timeout. Records the running build from the response headers.
 */
function anonymousHttp({ baseUrl, fetch, sleep }) {
  const root = baseUrl.replace(/\/+$/, '');
  let sent = 0;
  const build = { commit: '', version: '' };
  /** @type {Http} */
  const http = {
    request: async (method, path, body) => {
      if (sent++ > 0) await sleep(PACING_MS);
      let res;
      try {
        res = await fetch(root + path, {
          method,
          headers: { accept: 'application/json', ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (error) {
        const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
        return { status: null, failure: timedOut ? 'timeout' : error instanceof Error ? error.message : String(error) };
      }
      build.commit ||= res.headers.get('cms-commit') ?? '';
      build.version ||= res.headers.get('cms-version') ?? '';
      let error;
      try {
        error = (await res.json())?.error;
      } catch {
        error = undefined;
      }
      return { status: res.status, name: error?.name, message: error?.message };
    },
  };
  return { http, build };
}

/**
 * Runs every check once, then re-runs those with only retryable failures
 * until they pass or `waitMs` is used up.
 *
 * @param {{ checks: Check[], http: Http, waitMs: number, now: () => number, sleep: (ms: number) => Promise<void> }} options
 * @returns {Promise<Failure[]>}
 */
async function runChecks({ checks, http, waitMs, now, sleep }) {
  /** @type {Map<string, Failure[]>} */
  const results = new Map();
  for (const check of checks) results.set(check.id, await check.run(http));

  // The wait starts after the first pass, which alone takes a minute of pacing.
  const deadline = now() + waitMs;
  const retryable = () => checks.filter((c) => results.get(c.id)?.some((f) => RETRIED.has(f.category)));
  for (let pending = retryable(); pending.length && now() + RETRY_INTERVAL_MS <= deadline; pending = retryable()) {
    await sleep(RETRY_INTERVAL_MS);
    for (const check of pending) results.set(check.id, await check.run(http));
  }
  return [...results.values()].flat();
}

const bySeverity = (a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category);
const cell = (text) => String(text).replace(/\|/g, '\\|');

/** `leak 1 · drift 0 · …` */
const countsOf = (failures) => CATEGORIES.map((c) => `${c} ${failures.filter((f) => f.category === c).length}`).join(' · ');

/**
 * @param {{ baseUrl: string, build: string, time: string, checkCount: number, failures: Failure[], notProbed: NotProbed[] }} run
 * @returns {string}
 */
export function formatReport({ baseUrl, build, time, checkCount, failures, notProbed }) {
  const sorted = [...failures].sort(bySeverity);
  const lines = [
    '# Permission probe',
    '',
    `- Base URL: ${baseUrl}`,
    `- Build: ${build}`,
    `- Time: ${time}`,
    `- Result: ${failures.length ? 'FAIL' : 'pass'}, ${checkCount} checks, ${failures.length} failures`,
    `- Failures by category: ${countsOf(failures)}`,
    '',
    '## Failures',
    '',
  ];
  if (sorted.length === 0) lines.push('None.');
  else {
    lines.push('| Category | Type or route | Action | Locale | Expected | Got | Consumers |', '|---|---|---|---|---|---|---|');
    for (const f of sorted) {
      lines.push(
        `| ${[f.category, `\`${f.target}\``, f.action, f.locale ?? '–', f.expected, f.got, f.consumers.join(', ') || '–']
          .map(cell)
          .join(' | ')} |`,
      );
    }
  }
  lines.push('', '## Not probed', '', '| Type or route | Action | Reason |', '|---|---|---|');
  for (const n of notProbed) lines.push(`| \`${cell(n.target)}\` | ${cell(n.action)} | ${cell(n.reason)} |`);
  return `${lines.join('\n')}\n`;
}

const USAGE = 'usage: permissions:probe <baseUrl> [--report <file>] [--wait <seconds>]';

function parseArgs(argv) {
  const args = { baseUrl: '', report: '', waitMs: 0 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--report') args.report = argv[++i] ?? '';
    else if (arg === '--wait') args.waitMs = Number(argv[++i]) * 1000;
    else if (arg.startsWith('--')) throw new Error(`unknown option ${arg}`);
    else if (args.baseUrl) throw new Error(`unexpected argument ${arg}`);
    else args.baseUrl = arg;
  }
  if (!/^https?:\/\//.test(args.baseUrl)) throw new Error('the base URL is required, e.g. http://127.0.0.1:1337/api');
  if (!Number.isFinite(args.waitMs) || args.waitMs < 0) throw new Error('--wait needs a number of seconds');
  if (argv.includes('--report') && !args.report) throw new Error('--report needs a file');
  return args;
}

/**
 * The command. Returns the exit code: 0 pass, 1 any failure, 2 bad usage.
 *
 * @param {string[]} argv
 * @param {Deps} [deps]
 * @returns {Promise<number>}
 */
export async function probeCommand(argv, deps = {}) {
  const {
    fetch = globalThis.fetch,
    now = Date.now,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    writeFile = (path, text) => writeFileSync(path, text),
    stdout = (line) => console.log(line),
    stderr = (line) => console.error(line),
    manifest = defaultManifest,
    surface = loadSurface(),
  } = deps;

  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    stderr(`permissions:probe: ${error instanceof Error ? error.message : error}\n${USAGE}`);
    return 2;
  }

  const time = new Date(now()).toISOString();
  const halves = checkHalves({ manifest, surface });
  const checks = halves.flatMap((h) => h.checks);
  const { http, build } = anonymousHttp({ baseUrl: args.baseUrl, fetch, sleep });
  const failures = (await runChecks({ checks, http, waitMs: args.waitMs, now, sleep })).sort(bySeverity);

  const report = formatReport({
    baseUrl: args.baseUrl,
    build: build.commit ? `cms-commit ${build.commit}` : build.version ? `cms-version ${build.version}` : 'unknown',
    time,
    checkCount: checks.length,
    failures,
    notProbed: halves.flatMap((h) => h.notProbed),
  });
  if (args.report) writeFile(args.report, report);

  if (failures.length === 0) {
    stdout(`permission probe: pass, ${checks.length} checks, 0 failures`);
    return 0;
  }
  for (const f of failures) {
    const where = [f.target, f.action, f.locale].filter(Boolean).join(' ');
    stderr(`FAIL ${f.category}: ${where}: expected ${f.expected}, got ${f.got}`);
  }
  stderr(`permission probe: FAIL, ${checks.length} checks, ${failures.length} failures (${countsOf(failures)})`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  probeCommand(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
