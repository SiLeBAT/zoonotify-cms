import { describe, expect, it, vi } from 'vitest';
import realManifest from '../../config/permissions.mjs';
import { fakeCms } from './fake-cms.mjs';
import { loadSurface, publicActionUids, requiredContent } from './manifest.mjs';
import { probeCommand } from './probe.mjs';

const BASE = 'http://127.0.0.1:1337/api';

const realSurface = loadSurface();

/** Every published entry the manifest requires, as fake-cms keys. */
const allContent = (manifest, surface) =>
  requiredContent(manifest, surface).map((c) => `${c.pluralName}:${c.locale ?? ''}`);

/** A host whose grants and content match the manifest exactly. */
const matchingHost = (manifest, surface, extra = {}) => ({
  surface,
  grants: publicActionUids(manifest, surface),
  published: allContent(manifest, surface),
  ...extra,
});

/**
 * Runs the command against a fake host and captures everything it emits.
 * `fetch` may be a fake-cms host description or a fetch function.
 */
async function run({ argv = [BASE, '--report', 'report.md'], host, manifest = realManifest, surface = realSurface } = {}) {
  const fetch = vi.fn(typeof host === 'function' ? host : fakeCms(host ?? matchingHost(manifest, surface)));
  let t = Date.parse('2026-10-30T05:17:00Z');
  const sleep = vi.fn(async (ms) => void (t += ms));
  const files = {};
  const out = [];
  const err = [];
  const code = await probeCommand(argv, {
    manifest,
    surface,
    fetch,
    now: () => t,
    sleep,
    writeFile: (path, text) => void (files[path] = text),
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
  });
  return { code, report: files['report.md'], files, out, err, fetch, sleep };
}

describe('permissions:probe against a host matching the manifest', () => {
  it('passes with one counts line and no FAIL lines', async () => {
    const { code, out, err } = await run();

    expect(code).toBe(0);
    expect(err).toEqual([]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(/^permission probe: pass, \d+ checks, 0 failures$/);
  });
});

/** The real manifest's host with a mutation applied. */
const mutated = ({ grant = [], revoke = [], unpublish = [], ...extra }) => {
  const host = matchingHost(realManifest, realSurface, extra);
  host.grants = [...host.grants.filter((g) => !revoke.includes(g)), ...grant];
  host.published = host.published.filter((p) => !unpublish.includes(p));
  return host;
};

const failureRows = (report) =>
  report
    .split('\n')
    .filter((l) => /^\| (leak|drift|not deployed|missing content|error) \|/.test(l));

describe('permissions:probe failure categories', () => {
  it('reports a removed grant as drift', async () => {
    const { code, err, report } = await run({ host: mutated({ revoke: ['api::matrix.matrix.find'] }) });

    expect(code).toBe(1);
    expect(err).toContain(
      'FAIL drift: matrices find: expected 200, got 403 ForbiddenError; ?populate=zzprobe: 403 ForbiddenError',
    );
    expect(failureRows(report)).toEqual([
      '| drift | `matrices` | find | – | 200 | 403 ForbiddenError; ?populate=zzprobe: 403 ForbiddenError | client, publicDataApi |',
    ]);
  });

  it('reports an extra read grant on a denied type as a leak', async () => {
    const { code, err } = await run({ host: mutated({ grant: ['api::isolate.isolate.find'] }) });

    expect(code).toBe(1);
    expect(err).toContain('FAIL leak: isolates find: expected 403 ForbiddenError or 401, got 200');
  });

  it('reports a write reaching validation (400) or a fake-id lookup (404) as a leak', async () => {
    const { err } = await run({
      host: mutated({ grant: ['api::isolate.isolate.create', 'api::isolate.isolate.delete'] }),
    });

    expect(err).toContain('FAIL leak: isolates create: expected 403 ForbiddenError or 401, got 400 ValidationError');
    expect(err).toContain('FAIL leak: isolates delete: expected 403 ForbiddenError or 401, got 404 NotFoundError');
  });

  it('reports an unpublished locale of a client single type as missing content, per locale', async () => {
    const { code, err, report } = await run({ host: mutated({ unpublish: ['multi-resistance-informations:en'] }) });

    expect(code).toBe(1);
    expect(failureRows(report)).toEqual([
      '| missing content | `multi-resistance-informations` | find | en | published | 404 NotFoundError; ?populate=zzprobe: 400 ValidationError | client |',
    ]);
    expect(err[0]).toBe(
      'FAIL missing content: multi-resistance-informations find en: expected published, got 404 NotFoundError; ?populate=zzprobe: 400 ValidationError',
    );
  });

  it('reports data-import with no recorded import as missing content', async () => {
    const { err } = await run({ host: mutated({ unpublish: ['data-imports:'] }) });

    expect(err[0]).toMatch(/^FAIL missing content: data-imports find: expected published, got 404/);
  });

  it('reports a type the host does not serve as not deployed, once', async () => {
    const { code, report } = await run({ host: mutated({ notDeployed: ['data-imports'] }) });

    expect(code).toBe(1);
    expect(failureRows(report)).toEqual([
      '| not deployed | `data-imports` | find | – | 200 | 404 NotFoundError; ?populate=zzprobe: 404 NotFoundError | client |',
    ]);
  });

  it('fails a 500 on a denied action as error, never as a deny', async () => {
    const host = mutated({});
    host.answer = (method, path) =>
      method === 'GET' && path.startsWith('/controlled-vocabularies')
        ? { status: 500, body: { error: { status: 500, name: 'InternalServerError', message: 'x' } } }
        : undefined;

    const { code, err } = await run({ host });

    expect(code).toBe(1);
    expect(err).toContain(
      'FAIL error: controlled-vocabularies find: expected 403 ForbiddenError or 401, got 500 InternalServerError',
    );
  });

  it('fails a timeout as error', async () => {
    const host = mutated({});
    host.answer = (method, path) =>
      path === '/welcome?locale=de' ? Object.assign(new Error('aborted'), { name: 'TimeoutError' }) : undefined;

    const { err } = await run({ host });

    expect(err[0]).toBe('FAIL error: welcomes find: expected 200, got timeout; ?populate=zzprobe: 400 ValidationError');
  });

  it('names the cause when the host cannot be reached', async () => {
    const refused = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });

    const { code, err } = await run({
      host: async () => {
        throw refused;
      },
    });

    expect(code).toBe(1);
    expect(err[0]).toMatch(/^FAIL error: .*, got ECONNREFUSED/);
  });

  it('treats PolicyError on /import-admin/* as a Public grant (drift) and ForbiddenError as a pass', async () => {
    const { code, err } = await run({ host: mutated({ grant: ['api::import-admin.import-admin.truncate'] }) });

    expect(code).toBe(1);
    expect(err.filter((l) => l.startsWith('FAIL'))).toEqual([
      'FAIL drift: POST /import-admin/truncate truncate: expected 403 ForbiddenError, got 403 PolicyError',
    ]);
  });

  it('reports open self-registration (400 ValidationError on an empty body) as a leak', async () => {
    const { err } = await run({
      host: mutated({ grant: ['plugin::users-permissions.auth.register'], signUps: true }),
    });

    expect(err).toContain(
      'FAIL leak: POST /auth/local/register users-permissions.auth.register: expected 403 ForbiddenError or 401, got 400 ValidationError',
    );
  });

  it('reports register granted with sign-ups off as drift', async () => {
    const { err } = await run({ host: mutated({ grant: ['plugin::users-permissions.auth.register'] }) });

    expect(err).toContain(
      'FAIL drift: POST /auth/local/register users-permissions.auth.register: expected 403 ForbiddenError or 401, got 400 ApplicationError',
    );
  });

  it("probes users-permissions' auth.* actions with empty bodies", async () => {
    const { fetch } = await run();

    const auth = fetch.mock.calls.filter(([url, init]) => new URL(url).pathname.startsWith('/api/auth/') && init.method === 'POST');
    expect(auth.length).toBeGreaterThanOrEqual(7);
    for (const [, init] of auth) expect(init.body).toBe('{}');
  });

  it('orders failures leak → drift → not deployed → missing content → error', async () => {
    const host = mutated({
      grant: ['api::isolate.isolate.find'],
      revoke: ['api::matrix.matrix.find'],
      unpublish: ['welcomes:de'],
      notDeployed: ['data-imports'],
    });
    host.answer = (method, path) => (path === '/upload/files' ? { status: 502 } : undefined);

    const { err, report } = await run({ host });

    expect(failureRows(report).map((r) => r.split(' | ')[0].slice(2))).toEqual([
      'leak',
      'drift',
      'not deployed',
      'missing content',
      'error',
    ]);
    expect(err.map((l) => l.split(':')[0])).toEqual([
      'FAIL leak',
      'FAIL drift',
      'FAIL not deployed',
      'FAIL missing content',
      'FAIL error',
      'permission probe',
    ]);
  });
});

describe('permissions:probe single-type DELETE', () => {
  it('never sends it and lists it under "Not probed" for every single type', async () => {
    const { fetch, report } = await run();
    const singles = realSurface.contentTypes.filter((ct) => ct.kind === 'singleType');

    const singlePaths = new Set(singles.map((ct) => `/api/${ct.singularName}`));
    const deletes = fetch.mock.calls.filter(([url, init]) => init.method === 'DELETE' && singlePaths.has(new URL(url).pathname));
    expect(deletes).toEqual([]);

    const notProbed = report.slice(report.indexOf('## Not probed'));
    expect(singles.length).toBeGreaterThan(0);
    for (const ct of singles) expect(notProbed).toContain(`| \`${ct.pluralName}\` | delete |`);
  });
});

/** A host that changes from `before` to `after` once `heals(url)` has seen a request. */
const healingHost = (before, after, heals) => {
  let healed = false;
  const [b, a] = [fakeCms(before), fakeCms(after)];
  return async (url, init) => {
    const res = await (healed ? a : b)(url, init);
    if (heals(url)) healed = true;
    return res;
  };
};

describe('permissions:probe --wait', () => {
  it('retries a not-deployed type until the host serves it', async () => {
    const host = healingHost(mutated({ notDeployed: ['data-imports'] }), mutated({}), (url) =>
      url.endsWith('/data-import?populate=zzprobe'),
    );

    const { code, sleep } = await run({ argv: [BASE, '--wait', '60'], host });

    expect(code).toBe(0);
    expect(sleep.mock.calls.filter(([ms]) => ms === 15_000)).toHaveLength(1);
  });

  it('retries an error until it heals, and gives up when the wait is over', async () => {
    const failing = mutated({});
    failing.answer = (method, path) => (path === '/welcome?locale=en' ? { status: 503 } : undefined);

    const healed = await run({
      argv: [BASE, '--wait', '30'],
      host: healingHost(failing, mutated({}), (url) => url.endsWith('/welcome?populate=zzprobe')),
    });
    const never = await run({ argv: [BASE, '--wait', '60'], host: failing });

    expect(healed.code).toBe(0);
    expect(never.code).toBe(1);
    const retries = never.sleep.mock.calls.filter(([ms]) => ms === 15_000).length;
    expect(retries).toBeGreaterThan(1);
    expect(retries).toBeLessThanOrEqual(4); // 60 s / 15 s
  });

  it('reports drift on the first pass without retrying it', async () => {
    const { code, sleep } = await run({
      argv: [BASE, '--wait', '300'],
      host: mutated({ revoke: ['api::matrix.matrix.find'] }),
    });

    expect(code).toBe(1);
    expect(sleep.mock.calls.filter(([ms]) => ms === 15_000)).toEqual([]);
  });
});

describe('permissions:probe requests', () => {
  it('are anonymous, sequential, about 250 ms apart and time out after 30 s', async () => {
    const { fetch, sleep } = await run();

    for (const [, init] of fetch.mock.calls) {
      expect(Object.keys(init.headers).map((h) => h.toLowerCase())).not.toContain('authorization');
      expect(init.signal).toBeInstanceOf(AbortSignal);
    }
    expect(sleep.mock.calls).toHaveLength(fetch.mock.calls.length - 1);
    expect(new Set(sleep.mock.calls.map(([ms]) => ms))).toEqual(new Set([250]));
  });

  it('go to the base URL given, which is required', async () => {
    const { code, err, fetch } = await run({ argv: ['--report', 'report.md'] });

    expect(code).toBe(2);
    expect(err.join('\n')).toMatch(/base URL is required/);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('permissions:probe report', () => {
  it('heads the report with base URL, running build, time and counts per category', async () => {
    const { report } = await run({
      host: mutated({ revoke: ['api::matrix.matrix.find'], headers: { 'cms-commit': 'abc1234', 'cms-version': '4.5.0' } }),
    });

    expect(report).toMatch(/^# Permission probe\n/);
    expect(report).toContain(`- Base URL: ${BASE}\n`);
    expect(report).toContain('- Build: cms-commit abc1234\n');
    expect(report).toContain('- Time: 2026-10-30T05:17:00.000Z\n');
    expect(report).toMatch(/- Result: FAIL, \d+ checks, 1 failures\n/);
    expect(report).toContain('- Failures by category: leak 0 · drift 1 · not deployed 0 · missing content 0 · error 0\n');
    expect(report).toContain('| Category | Type or route | Action | Locale | Expected | Got | Consumers |');
  });

  it('falls back to cms-version for the build, and says None. when nothing failed', async () => {
    const { report } = await run({ host: mutated({ headers: { 'cms-version': '4.5.0' } }) });

    expect(report).toContain('- Build: cms-version 4.5.0\n');
    expect(report).toContain('## Failures\n\nNone.\n');
  });

  it('is written only when --report is given', async () => {
    const { files } = await run({ argv: [BASE] });

    expect(files).toEqual({});
  });
});
