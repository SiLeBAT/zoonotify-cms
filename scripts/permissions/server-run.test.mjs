import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { serverRun } from './server-run.mjs';

const TOKEN = 'reader-token-6f1c9e';
const BASE = 'https://qa.example/cms/api';
const NOW = Date.parse('2026-10-30T05:17:00Z');
const HOUR = 3_600_000;

/** A probe report as probe.mjs formats it, with the given failure rows. */
const report = (...rows) =>
  [
    '# Permission probe',
    '',
    `- Base URL: ${BASE}`,
    '- Build: cms-commit abc1234',
    `- Time: ${new Date(NOW).toISOString()}`,
    '- Admin checks: checked',
    `- Result: ${rows.length ? 'FAIL' : 'pass'}, 120 checks, ${rows.length} failures`,
    '',
    '## Failures',
    '',
    ...(rows.length
      ? ['| Category | Type or route | Action | Locale | Expected | Got | Consumers |', '|---|---|---|---|---|---|---|', ...rows]
      : ['None.']),
    '',
    '## Not probed',
    '',
    '| Type or route | Action | Reason |',
    '|---|---|---|',
    '| `homepage` | delete | never probed |',
    '',
  ].join('\n');

const LEAK = '| leak | `isolates` | create | – | 403 ForbiddenError | 400 ValidationError | – |';
const DRIFT = '| drift | `prevalences` | find | – | 200 | 403 ForbiddenError | client, publicDataApi |';
const DRIFT_OTHER_GOT = '| drift | `prevalences` | find | – | 200 | 401 UnauthorizedError | client, publicDataApi |';

const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/**
 * Runs serverRun against a fresh reports folder (optionally seeded with
 * `{ name: text }`) and records every side effect.
 */
async function run(mode, { probeReport = report(), probeCode, seed = {}, env = {}, now = NOW, mailStatus = 0 } = {}) {
  const reportsDir = mkdtempSync(join(tmpdir(), 'permission-reports-'));
  for (const [name, text] of Object.entries(seed)) writeFileSync(join(reportsDir, name), text);
  const probeCalls = [];
  const commands = [];
  const log = [];
  const code = await serverRun(mode, BASE, {
    env: { PERMISSIONS_READER_TOKEN: TOKEN, PERMISSIONS_PROBE_MAIL_TO: 'team@example.org', ...env },
    reportsDir,
    now: () => now,
    probe: async (argv, probeEnv) => {
      probeCalls.push({ argv, env: probeEnv });
      if (probeReport instanceof Error) throw probeReport;
      return { code: probeCode ?? (probeReport.includes('Result: pass') ? 0 : 1), report: probeReport };
    },
    run: (command, args, input) => {
      commands.push({ command, args, input });
      return mailStatus;
    },
    log: (line) => log.push(line),
  });
  const files = Object.fromEntries(readdirSync(reportsDir).map((n) => [n, readFileSync(join(reportsDir, n), 'utf8')]));
  const mails = commands.filter((c) => c.command === 'mail');
  return { code, files, probeCalls, commands, mails, log };
}

describe('cron run', () => {
  it('saves the report under a UTC timestamp and mails the first failure', async () => {
    const r = await run('cron', { probeReport: report(DRIFT) });
    expect(Object.keys(r.files)).toEqual(['20261030T051700Z-cron.md']);
    expect(r.files['20261030T051700Z-cron.md']).toBe(report(DRIFT));
    expect(r.mails).toHaveLength(1);
    expect(r.mails[0].args).toContain('team@example.org');
    expect(r.mails[0].input).toBe(report(DRIFT));
  });

  it('sends no mail while passing', async () => {
    const r = await run('cron', { probeReport: report() });
    expect(r.mails).toEqual([]);
    expect(r.code).toBe(0);
  });

  it('sends no mail when the failure set equals the last report, in any order', async () => {
    const r = await run('cron', {
      probeReport: report(LEAK, DRIFT),
      seed: { '20261029T051700Z-cron.md': report(DRIFT, LEAK) },
    });
    expect(r.mails).toEqual([]);
    expect(Object.keys(r.files)).toHaveLength(2);
  });

  it('mails when a new row fails', async () => {
    const r = await run('cron', { probeReport: report(LEAK, DRIFT), seed: { '20261029T051700Z-cron.md': report(DRIFT) } });
    expect(r.mails).toHaveLength(1);
  });

  it('mails when a row fails differently', async () => {
    const r = await run('cron', {
      probeReport: report(DRIFT_OTHER_GOT),
      seed: { '20261029T051700Z-cron.md': report(DRIFT) },
    });
    expect(r.mails).toHaveLength(1);
  });

  it('sends no recovery mail, full or partial', async () => {
    const seed = { '20261029T051700Z-cron.md': report(LEAK, DRIFT) };
    expect((await run('cron', { probeReport: report(), seed })).mails).toEqual([]);
    expect((await run('cron', { probeReport: report(DRIFT), seed })).mails).toEqual([]);
  });

  it('compares against the newest report, whether a deploy or a cron run wrote it', async () => {
    const r = await run('cron', {
      probeReport: report(DRIFT),
      seed: { '20261028T051700Z-cron.md': report(), '20261029T120000Z-deploy.md': report(DRIFT) },
    });
    expect(r.mails).toEqual([]);
  });
});

/** A cron report written `hoursAgo` before NOW. */
const cronReport = (hoursAgo, text = report()) => ({ [`${stamp(NOW - hoursAgo * HOUR)}-cron.md`]: text });

describe('post-deploy run', () => {
  it('logs one pass line and succeeds', async () => {
    const r = await run('deploy', { seed: cronReport(20) });
    expect(r.log).toEqual(['permission probe: pass']);
    expect(r.code).toBe(0);
    expect(r.mails).toEqual([]);
    expect(Object.keys(r.files)).toContain('20261030T051700Z-deploy.md');
  });

  it('mails every failure, even a known one, logs one line and fails', async () => {
    const r = await run('deploy', { probeReport: report(LEAK), seed: cronReport(20, report(LEAK)) });
    expect(r.log).toEqual(['permission probe: FAIL, report mailed']);
    expect(r.code).toBe(1);
    expect(r.mails).toHaveLength(1);
    expect(r.mails[0].input).toBe(report(LEAK));
  });

  it.each([
    ['no cron report at all', {}],
    ['only deploy reports', { [`${stamp(NOW - HOUR)}-deploy.md`]: report() }],
    ['a newest cron report older than 48 h', { ...cronReport(72), ...cronReport(48.1) }],
  ])('fails with "permission cron stale" on %s', async (_, seed) => {
    const r = await run('deploy', { seed });
    expect(r.log).toEqual(['permission probe: pass', 'permission cron stale']);
    expect(r.code).toBe(1);
  });

  it('accepts a cron report up to 48 h old', async () => {
    const r = await run('deploy', { seed: { ...cronReport(100), ...cronReport(47.9) } });
    expect(r.log).toEqual(['permission probe: pass']);
    expect(r.code).toBe(0);
  });

  it('reports a stale cron next to a failing probe', async () => {
    const r = await run('deploy', { probeReport: report(DRIFT) });
    expect(r.log).toEqual(['permission probe: FAIL, report mailed', 'permission cron stale']);
    expect(r.code).toBe(1);
  });

  it('says so when the mail could not be sent', async () => {
    const r = await run('deploy', { probeReport: report(LEAK), seed: cronReport(1), mailStatus: 1 });
    expect(r.log).toEqual(['permission probe: FAIL, mail not sent']);
    expect(r.code).toBe(1);
  });
});

describe('both runs', () => {
  it.each(['deploy', 'cron'])('%s: hands the token to the probe through the environment only', async (mode) => {
    const r = await run(mode, { probeReport: report(LEAK), seed: cronReport(1) });
    expect(r.probeCalls).toHaveLength(1);
    expect(r.probeCalls[0].argv).toEqual([BASE, '--require-admin', '--wait', '120']);
    expect(r.probeCalls[0].env.PERMISSIONS_READER_TOKEN).toBe(TOKEN);
    const outside = JSON.stringify({ commands: r.commands.map((c) => [c.command, c.args]), log: r.log, files: r.files });
    expect(outside).not.toContain(TOKEN);
  });

  it.each(['deploy', 'cron'])('%s: a crashing probe counts as a failure and is mailed', async (mode) => {
    const r = await run(mode, { probeReport: new Error('socket hang up'), seed: cronReport(1) });
    expect(r.code).toBe(1);
    expect(r.mails).toHaveLength(1);
    expect(r.mails[0].input).toContain('socket hang up');
    expect(Object.values(r.files).some((t) => t.includes('socket hang up'))).toBe(true);
  });

  it.each(['deploy', 'cron'])('%s: refuses to run without a mail recipient', async (mode) => {
    const r = await run(mode, { env: { PERMISSIONS_PROBE_MAIL_TO: '' }, seed: cronReport(1) });
    expect(r.code).toBe(1);
    expect(r.probeCalls).toEqual([]);
    expect(r.log).toEqual(['permission probe: PERMISSIONS_PROBE_MAIL_TO is not set in ~/permissions-probe.env']);
  });
});

describe('cron log', () => {
  it.each([
    ['a pass', report(), {}, 'permission probe: pass'],
    ['a new failure', report(LEAK), {}, 'permission probe: FAIL, report mailed'],
    ['a known failure', report(LEAK), { '20261029T051700Z-cron.md': report(LEAK) }, 'permission probe: FAIL, unchanged, not mailed'],
  ])('logs one line on %s', async (_, probeReport, seed, line) => {
    const r = await run('cron', { probeReport, seed });
    expect(r.log).toEqual([line]);
  });
});
