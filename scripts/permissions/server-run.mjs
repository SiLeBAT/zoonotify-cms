// @ts-check
// Runs the permission probe on a server, from the deployed checkout. Called by
// the two thin shell wrappers, which source ~/permissions-probe.env first:
//
//   scripts/permissions-deploy-check.sh <baseUrl>   (both deploy workflows)
//   scripts/permissions-cron.sh <baseUrl>           (daily crontab line)
//
// Both modes probe with --require-admin, save the full report as
// ~/permission-reports/<UTC timestamp>-<mode>.md and print only fixed lines:
// the repository is public, so the deploy log must never name a failure, and
// the token reaches the probe through the environment only (never argv).
//
// - deploy: mails every failing report, fails on any failure, and also fails
//   with `permission cron stale` when the newest cron report is older than
//   48 h (or there is none), so a dead crontab is noticed at the next deploy.
// - cron: mails only when the failure set gained a row since the newest saved
//   report (a new failure, or a row failing differently). No mail while
//   passing, on a known failure, or on recovery.
//
// Env (from ~/permissions-probe.env): PERMISSIONS_READER_TOKEN,
// PERMISSIONS_PROBE_MAIL_TO.

import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * @typedef {{
 *   env: Record<string, string | undefined>,
 *   reportsDir: string,
 *   now: () => number,
 *   probe: (argv: string[], env: Record<string, string | undefined>) => Promise<{ code: number, report: string }>,
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

/** The failure rows of a probe report, verbatim. */
function failureRows(report) {
  const section = report.split('## Failures')[1]?.split('## Not probed')[0] ?? '';
  return section
    .split('\n')
    .filter((line) => line.startsWith('|') && !line.startsWith('| Category |') && !line.startsWith('|---'));
}

/** True when the newest cron report is older than 48 h, or there is none. */
function cronStale(names, nowMs) {
  const newest = names.filter((n) => /^\d{8}T\d{6}Z-cron\.md$/.test(n)).sort().at(-1);
  return !newest || nowMs - parseStamp(newest.slice(0, 16)) > STALE_AFTER_MS;
}

/** A report for a probe that produced none, with one failure row so it compares like any other. */
const noReport = (baseUrl, why) =>
  [
    '# Permission probe',
    '',
    `- Base URL: ${baseUrl}`,
    '- Result: FAIL, the probe produced no report',
    '',
    '## Failures',
    '',
    '| Category | Type or route | Action | Locale | Expected | Got | Consumers |',
    '|---|---|---|---|---|---|---|',
    `| error | \`permissions:probe\` | – | – | a report | ${String(why).replace(/\|/g, '\\|').replace(/\n/g, ' ')} | – |`,
    '',
  ].join('\n');

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
  let code;
  let report;
  try {
    ({ code, report } = await probe([baseUrl, '--require-admin', '--wait', WAIT_SECONDS], env));
    if (!report) report = noReport(baseUrl, `exit code ${code}`);
  } catch (error) {
    report = noReport(baseUrl, `crashed: ${error instanceof Error ? error.message : error}`);
  }
  const failed = code !== 0;
  writeFileSync(join(reportsDir, `${stamp(now())}-${mode}.md`), report);
  const mail = () =>
    run('mail', ['-s', `zoonotify permission probe FAIL (${mode}): ${baseUrl}`, recipient], report) === 0
      ? 'report mailed'
      : 'mail not sent';

  if (mode === 'deploy') {
    log(failed ? `permission probe: FAIL, ${mail()}` : 'permission probe: pass');
    const stale = cronStale(readdirSync(reportsDir), now());
    if (stale) log('permission cron stale');
    return failed || stale ? 1 : 0;
  }

  if (!failed) {
    log('permission probe: pass');
    return 0;
  }
  const before = new Set(previous ? failureRows(readFileSync(join(reportsDir, previous), 'utf8')) : []);
  const changed = failureRows(report).some((row) => !before.has(row));
  log(`permission probe: FAIL, ${changed ? mail() : 'unchanged, not mailed'}`);
  return 1;
}

/** The real probe, in-process: its FAIL lines name failures, so they are swallowed; the report is captured. */
async function probeInProcess(argv, env) {
  const { probeCommand } = await import('./probe.mjs');
  let report = '';
  const code = await probeCommand([...argv, '--report', 'captured'], {
    env,
    writeFile: (_, text) => {
      report = text;
    },
    stdout: () => {},
    stderr: () => {},
  });
  return { code, report };
}

const USAGE = 'usage: node scripts/permissions/server-run.mjs <deploy|cron> <baseUrl>';

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [mode, baseUrl] = process.argv.slice(2);
  if ((mode !== 'deploy' && mode !== 'cron') || !baseUrl) {
    console.error(USAGE);
    process.exitCode = 2;
  } else {
    const reportsDir = join(homedir(), 'permission-reports');
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
