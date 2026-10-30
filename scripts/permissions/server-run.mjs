// @ts-check
// Runs the permission probe on a server, from the deployed checkout. Called by
// the thin shell wrapper, which selects the .nvmrc Node and sources
// ~/permissions-probe.env first:
//
//   scripts/permissions-check.sh deploy <baseUrl>   (both deploy workflows)
//   scripts/permissions-check.sh cron <baseUrl>     (daily crontab line)
//
// Both modes probe with --require-admin, save the full report as
// ~/permission-reports/<UTC timestamp>-<mode>.md, its failures as the sibling
// .json, and print only fixed lines: the repository is public, so the deploy
// log must never name a failure, and the token reaches the probe through the
// environment only (never argv).
//
// - deploy: mails every failing report, fails on any failure, and also fails
//   with `permission cron stale` when the newest cron report is older than
//   48 h (or there is none), so a dead crontab is noticed at the next deploy.
// - cron: mails whenever the failure set differs from the newest saved
//   report's (a new failure, a row failing differently, a partial recovery,
//   and once on returning to pass). No mail while it stays the same. The sets
//   are compared from the `.json` saved next to each report, keyed without
//   free-text causes (see failureKey), so a changing timeout or network
//   message does not mail daily. A newest report without a readable `.json`
//   (saved before they were kept) counts as unknown: mailed once.
//
// Env (from ~/permissions-probe.env): PERMISSIONS_READER_TOKEN,
// PERMISSIONS_PROBE_MAIL_TO.

import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { formatReport, probeCommand } from './probe.mjs';

/**
 * @typedef {import('./probe.mjs').Failure} Failure
 * @typedef {{
 *   env: Record<string, string | undefined>,
 *   reportsDir: string,
 *   now: () => number,
 *   probe: (argv: string[], env: Record<string, string | undefined>) => Promise<{ code: number, report: string, failures: Failure[] }>,
 *   run: (command: string, args: string[], input: string) => number,
 *   log: (line: string) => void,
 * }} Deps
 */

const RECIPIENT_VAR = 'PERMISSIONS_PROBE_MAIL_TO';
/** Rides out a blip; the deploy has already waited for the new build. */
const WAIT_SECONDS = '120';
const STALE_AFTER_MS = 48 * 3_600_000;
const STAMP = /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/;

/** epoch ms → `20261030T051700Z` (sorts by time, safe in file names). */
const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const parseStamp = (s) => Date.parse(s.replace(STAMP, '$1-$2-$3T$4:$5:$6Z'));

/**
 * What makes a failure row the same failure from one run to the next:
 * everything but the consumers and the free-text cause in the parentheses
 * after `no answer` / `no report` (a timeout one day, ECONNRESET the next).
 *
 * @param {Failure} f
 */
const failureKey = (f) =>
  JSON.stringify([f.category, f.target, f.action, f.locale, f.expected, f.got.replace(/\b(no answer|no report) \(.*?\)(?=;|$)/g, '$1')]);

/** The failure keys saved next to a report, or null when there are none to read. */
function savedKeys(reportsDir, reportName) {
  try {
    const { failures } = JSON.parse(readFileSync(join(reportsDir, reportName.replace(/\.md$/, '.json')), 'utf8'));
    return new Set(failures.map(failureKey));
  } catch {
    return null;
  }
}

const sameSet = (a, b) => a.size === b.size && [...a].every((k) => b.has(k));

/** True when the newest cron report is older than 48 h, or there is none. */
function cronStale(names, nowMs) {
  const newest = names.filter((n) => /^\d{8}T\d{6}Z-cron\.md$/.test(n)).sort().at(-1);
  return !newest || nowMs - parseStamp(newest.slice(0, 16)) > STALE_AFTER_MS;
}

/** A probe run that produced no report, as one failure, so it saves and compares like any other. */
function noReport(baseUrl, nowMs, why) {
  /** @type {Failure[]} */
  const failures = [
    { category: 'error', target: 'permissions:probe', action: '', locale: null, expected: 'a report', got: `no report (${why})`, consumers: [] },
  ];
  const time = new Date(nowMs).toISOString();
  const report = formatReport({ baseUrl, build: 'unknown', time, adminChecked: null, checkCount: 0, failures, notProbed: [] });
  return { failures, report };
}

/**
 * @param {'deploy' | 'cron'} mode
 * @param {string} baseUrl
 * @param {Deps} deps
 * @returns {Promise<number>} exit code
 */
export async function serverRun(mode, baseUrl, deps) {
  const { env, reportsDir, now, probe, run, log } = deps;
  const recipient = env[RECIPIENT_VAR];
  if (!recipient) {
    log(`permission probe: ${RECIPIENT_VAR} is not set in ~/permissions-probe.env`);
    return 1;
  }

  const previous = readdirSync(reportsDir).filter((n) => n.endsWith('.md')).sort().at(-1);
  let code = 1;
  let report = '';
  /** @type {Failure[]} */
  let failures = [];
  try {
    ({ code, report, failures = [] } = await probe([baseUrl, '--require-admin', '--wait', WAIT_SECONDS], env));
    if (!report) ({ report, failures } = noReport(baseUrl, now(), `exit code ${code}`));
  } catch (error) {
    ({ report, failures } = noReport(baseUrl, now(), `crashed: ${error instanceof Error ? error.message : error}`));
  }
  const failed = code !== 0;
  const name = `${stamp(now())}-${mode}`;
  writeFileSync(join(reportsDir, `${name}.md`), report);
  writeFileSync(join(reportsDir, `${name}.json`), `${JSON.stringify({ failures }, null, 2)}\n`);
  const result = failed ? 'FAIL' : 'pass';
  const mail = () =>
    run('mail', ['-s', `zoonotify permission probe ${result} (${mode}): ${baseUrl}`, recipient], report) === 0
      ? 'report mailed'
      : 'mail not sent';

  if (mode === 'deploy') {
    log(failed ? `permission probe: FAIL, ${mail()}` : 'permission probe: pass');
    const stale = cronStale(readdirSync(reportsDir), now());
    if (stale) log('permission cron stale');
    return failed || stale ? 1 : 0;
  }

  // No earlier report: nothing to differ from, so only a failure is news.
  const before = previous ? savedKeys(reportsDir, previous) : new Set();
  const changed = before === null || !sameSet(before, new Set(failures.map(failureKey)));
  if (changed) log(`permission probe: ${result}, ${mail()}`);
  else log(failed ? 'permission probe: FAIL, unchanged, not mailed' : 'permission probe: pass');
  return failed ? 1 : 0;
}

/** The real probe, in-process: its FAIL lines name failures, so they are swallowed; the report is captured. */
async function probeInProcess(argv, env) {
  let report = '';
  /** @type {Failure[]} */
  let failures = [];
  const code = await probeCommand([...argv, '--report', 'captured'], {
    env,
    writeFile: (_, text) => {
      report = text;
    },
    onFailures: (f) => {
      failures = f;
    },
    stdout: () => {},
    stderr: () => {},
  });
  return { code, report, failures };
}

const USAGE = 'usage: node scripts/permissions/server-run.mjs <deploy|cron> <baseUrl>';

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [mode, baseUrl] = process.argv.slice(2);
  if ((mode !== 'deploy' && mode !== 'cron') || !baseUrl) {
    console.error(USAGE);
    process.exitCode = 2;
  } else {
    // $HOME first: the wrappers' ~ (homedir() ignores HOME on Windows).
    const reportsDir = join(process.env.HOME || homedir(), 'permission-reports');
    mkdirSync(reportsDir, { recursive: true });
    serverRun(mode, baseUrl, {
      env: process.env,
      reportsDir,
      now: Date.now,
      probe: probeInProcess,
      run: (command, args, input) => spawnSync(command, args, { input, stdio: ['pipe', 'ignore', 'ignore'] }).status ?? 1,
      log: (line) => console.log(line),
    }).then(
      (code) => {
        process.exitCode = code;
      },
      () => {
        // Not printed: an unexpected error could carry request details.
        console.log('permission probe: FAIL, internal error');
        process.exitCode = 1;
      },
    );
  }
}
