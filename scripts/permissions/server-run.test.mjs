import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { serverRun } from './server-run.mjs';

const TOKEN = 'reader-token-6f1c9e';
const BASE = 'https://qa.example/cms/api';
const NOW = Date.parse('2026-10-30T05:17:00Z');
const HOUR = 3_600_000;

/** A probe failure row, as probe.mjs hands it over. */
const failure = (category, target, action, expected, got, consumers = []) => ({
  category,
  target,
  action,
  locale: null,
  expected,
  got,
  consumers,
});

const LEAK = failure('leak', 'isolates', 'create', '403 ForbiddenError', '400 ValidationError');
const DRIFT = failure('drift', 'prevalences', 'find', '200', '403 ForbiddenError', ['client', 'publicDataApi']);
const DRIFT_OTHER_GOT = { ...DRIFT, got: '401 UnauthorizedError' };
const DRIFT_DE = { ...DRIFT, locale: 'de' };
const NO_ANSWER = (cause) =>
  failure('error', 'welcomes', 'find', '200', `no answer (${cause}); ?populate=zzprobe: 400 ValidationError`);

/** A probe run: its report (opaque to serverRun) and its failures. */
const result = (...failures) => ({
  failures,
  report: `# Permission probe\n\n- Result: ${failures.length ? 'FAIL' : 'pass'}\n${failures.map((f) => `| ${f.target} | ${f.got} |\n`).join('')}`,
});

/** A saved report pair as serverRun writes it: `<name>.md` and `<name>.json`. */
const saved = (name, ...failures) => ({
  [`${name}.md`]: result(...failures).report,
  [`${name}.json`]: JSON.stringify({ failures }),
});

const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/**
 * Runs serverRun against a fresh reports folder (optionally seeded with
 * `{ name: text }`) and records every side effect.
 */
async function run(mode, { probeResult = result(), probeCode, seed = {}, env = {}, now = NOW, mailStatus = 0 } = {}) {
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
      if (probeResult instanceof Error) throw probeResult;
      return { code: probeCode ?? (probeResult.failures.length ? 1 : 0), ...probeResult };
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

const YESTERDAY = '20261029T051700Z-cron';
const subject = (mail) => mail.args[mail.args.indexOf('-s') + 1];

describe('cron run', () => {
  it('saves the report and its failures under a UTC timestamp and mails the first failure', async () => {
    const r = await run('cron', { probeResult: result(DRIFT) });
    expect(Object.keys(r.files).sort()).toEqual(['20261030T051700Z-cron.json', '20261030T051700Z-cron.md']);
    expect(r.files['20261030T051700Z-cron.md']).toBe(result(DRIFT).report);
    expect(JSON.parse(r.files['20261030T051700Z-cron.json'])).toEqual({ failures: [DRIFT] });
    expect(r.mails).toHaveLength(1);
    expect(r.mails[0].args).toContain('team@example.org');
    expect(subject(r.mails[0])).toBe(`zoonotify permission probe FAIL (cron): ${BASE}`);
    expect(r.mails[0].input).toBe(result(DRIFT).report);
  });

  it('sends no mail while passing', async () => {
    expect((await run('cron', { probeResult: result() })).mails).toEqual([]);
    const r = await run('cron', { probeResult: result(), seed: saved(YESTERDAY) });
    expect(r.mails).toEqual([]);
    expect(r.code).toBe(0);
  });

  it('sends no mail when the failure set equals the last report, in any order', async () => {
    const r = await run('cron', { probeResult: result(LEAK, DRIFT), seed: saved(YESTERDAY, DRIFT, LEAK) });
    expect(r.mails).toEqual([]);
    expect(Object.keys(r.files)).toHaveLength(4);
  });

  it('ignores the free-text cause of a missing answer, and the consumers', async () => {
    const r = await run('cron', {
      probeResult: result({ ...LEAK, consumers: ['client'] }, NO_ANSWER('ECONNRESET')),
      seed: saved(YESTERDAY, LEAK, NO_ANSWER('timeout')),
    });
    expect(r.mails).toEqual([]);
  });

  it('mails when a new row fails', async () => {
    const r = await run('cron', { probeResult: result(LEAK, DRIFT), seed: saved(YESTERDAY, DRIFT) });
    expect(r.mails).toHaveLength(1);
  });

  it.each([
    ['another answer', DRIFT_OTHER_GOT],
    ['another locale', DRIFT_DE],
    ['an answer where there was none', { ...NO_ANSWER('timeout'), got: '500 InternalServerError; ?populate=zzprobe: 400 ValidationError' }],
  ])('mails when a row fails differently: %s', async (_, now) => {
    const before = now === DRIFT_OTHER_GOT || now === DRIFT_DE ? DRIFT : NO_ANSWER('timeout');
    const r = await run('cron', { probeResult: result(now), seed: saved(YESTERDAY, before) });
    expect(r.mails).toHaveLength(1);
  });

  it('mails a partial recovery', async () => {
    const r = await run('cron', { probeResult: result(DRIFT), seed: saved(YESTERDAY, LEAK, DRIFT) });
    expect(r.mails).toHaveLength(1);
    expect(r.log).toEqual(['permission probe: FAIL, report mailed']);
    expect(r.code).toBe(1);
  });

  it('mails a full recovery once, as a pass', async () => {
    const r = await run('cron', { probeResult: result(), seed: saved(YESTERDAY, LEAK, DRIFT) });
    expect(r.mails).toHaveLength(1);
    expect(subject(r.mails[0])).toBe(`zoonotify permission probe pass (cron): ${BASE}`);
    expect(r.mails[0].input).toBe(result().report);
    expect(r.log).toEqual(['permission probe: pass, report mailed']);
    expect(r.code).toBe(0);

    const next = await run('cron', { probeResult: result(), seed: saved('20261030T051700Z-cron') });
    expect(next.mails).toEqual([]);
  });

  it('mails once when the newest report has no readable failures (saved before they were kept)', async () => {
    const old = { [`${YESTERDAY}.md`]: '# Permission probe\n\n## Failures\n\n| garbled' };
    expect((await run('cron', { probeResult: result(DRIFT), seed: old })).mails).toHaveLength(1);
    expect((await run('cron', { probeResult: result(), seed: old })).mails).toHaveLength(1);
    const unreadable = { ...old, [`${YESTERDAY}.json`]: '{not json' };
    expect((await run('cron', { probeResult: result(), seed: unreadable })).mails).toHaveLength(1);
  });

  it('compares against the newest report, whether a deploy or a cron run wrote it', async () => {
    const r = await run('cron', {
      probeResult: result(DRIFT),
      seed: { ...saved('20261028T051700Z-cron'), ...saved('20261029T120000Z-deploy', DRIFT) },
    });
    expect(r.mails).toEqual([]);
  });
});

/** A cron report pair written `hoursAgo` before NOW. */
const cronReport = (hoursAgo, ...failures) => saved(`${stamp(NOW - hoursAgo * HOUR)}-cron`, ...failures);

describe('post-deploy run', () => {
  it('logs one pass line and succeeds', async () => {
    const r = await run('deploy', { seed: cronReport(20) });
    expect(r.log).toEqual(['permission probe: pass']);
    expect(r.code).toBe(0);
    expect(r.mails).toEqual([]);
    expect(Object.keys(r.files)).toContain('20261030T051700Z-deploy.md');
    expect(Object.keys(r.files)).toContain('20261030T051700Z-deploy.json');
  });

  it('mails every failure, even a known one, logs one line and fails', async () => {
    const r = await run('deploy', { probeResult: result(LEAK), seed: cronReport(20, LEAK) });
    expect(r.log).toEqual(['permission probe: FAIL, report mailed']);
    expect(r.code).toBe(1);
    expect(r.mails).toHaveLength(1);
    expect(r.mails[0].input).toBe(result(LEAK).report);
  });

  it('sends no recovery mail', async () => {
    const r = await run('deploy', { seed: cronReport(20, LEAK) });
    expect(r.mails).toEqual([]);
  });

  it.each([
    ['no cron report at all', {}],
    ['only deploy reports', saved(`${stamp(NOW - HOUR)}-deploy`)],
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
    const r = await run('deploy', { probeResult: result(DRIFT) });
    expect(r.log).toEqual(['permission probe: FAIL, report mailed', 'permission cron stale']);
    expect(r.code).toBe(1);
  });

  it('says so when the mail could not be sent', async () => {
    const r = await run('deploy', { probeResult: result(LEAK), seed: cronReport(1), mailStatus: 1 });
    expect(r.log).toEqual(['permission probe: FAIL, mail not sent']);
    expect(r.code).toBe(1);
  });
});

describe('both runs', () => {
  it.each(['deploy', 'cron'])('%s: hands the token to the probe through the environment only', async (mode) => {
    const r = await run(mode, { probeResult: result(LEAK), seed: cronReport(1) });
    expect(r.probeCalls).toHaveLength(1);
    expect(r.probeCalls[0].argv).toEqual([BASE, '--require-admin', '--wait', '120']);
    expect(r.probeCalls[0].env.PERMISSIONS_READER_TOKEN).toBe(TOKEN);
    const outside = JSON.stringify({ commands: r.commands.map((c) => [c.command, c.args]), log: r.log, files: r.files });
    expect(outside).not.toContain(TOKEN);
  });

  it.each(['deploy', 'cron'])('%s: a crashing probe counts as a failure and is mailed as a report', async (mode) => {
    const r = await run(mode, { probeResult: new Error('socket hang up'), seed: cronReport(1) });
    expect(r.code).toBe(1);
    expect(r.mails).toHaveLength(1);
    const mailed = r.mails[0].input;
    expect(mailed).toMatch(/^# Permission probe\n/);
    expect(mailed).toContain(`- Base URL: ${BASE}\n`);
    expect(mailed).toContain('| error | `permissions:probe` | – | – | a report | no report (crashed: socket hang up) | – |');
    expect(r.files[`20261030T051700Z-${mode}.md`]).toBe(mailed);
  });

  it('cron: a probe crashing again with another message is not mailed again', async () => {
    const first = await run('cron', { probeResult: new Error('socket hang up') });
    const seed = Object.fromEntries(Object.entries(first.files).map(([n, t]) => [n.replace('20261030', '20261029'), t]));
    const r = await run('cron', { probeResult: new Error('read ECONNRESET'), seed });
    expect(r.mails).toEqual([]);
    expect(r.log).toEqual(['permission probe: FAIL, unchanged, not mailed']);
  });

  it('cron: a probe exiting without a report counts as a failure', async () => {
    const r = await run('cron', { probeResult: { failures: [], report: '' }, probeCode: 2 });
    expect(r.code).toBe(1);
    expect(r.mails[0].input).toContain('| a report | no report (exit code 2) |');
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
    ['a pass', result(), {}, 'permission probe: pass'],
    ['a new failure', result(LEAK), {}, 'permission probe: FAIL, report mailed'],
    ['a known failure', result(LEAK), saved(YESTERDAY, LEAK), 'permission probe: FAIL, unchanged, not mailed'],
  ])('logs one line on %s', async (_, probeResult, seed, line) => {
    const r = await run('cron', { probeResult, seed });
    expect(r.log).toEqual([line]);
  });
});
