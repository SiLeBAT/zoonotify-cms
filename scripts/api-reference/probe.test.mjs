import { describe, expect, it, vi } from 'vitest';
import { formatReport, probe, promisedCollections } from './probe.mjs';

const respond = (statusFor) =>
  vi.fn(async (url) => {
    const collection = new URL(url).pathname.split('/').pop();
    const status = statusFor(collection);
    if (status instanceof Error) throw status;
    return { status };
  });

const clock = () => {
  let t = 0;
  return { now: () => t, sleep: async (ms) => void (t += ms) };
};

const run = (fetch, extra = {}) =>
  probe({
    baseUrl: 'https://cms.test/api/',
    collections: ['prevalences', 'matrices'],
    fetch,
    ...clock(),
    ...extra,
  });

describe('promisedCollections', () => {
  it('flattens every include group, in order, and ignores excludes', () => {
    expect(
      promisedCollections({ include: { A: ['x', 'y'], B: ['z'] }, exclude: ['nope'] }),
    ).toEqual(['x', 'y', 'z']);
  });
});

describe('probe', () => {
  it('sends one anonymous GET per collection with pageSize 1', async () => {
    const fetch = respond(() => 200);

    const failures = await run(fetch);

    expect(failures).toEqual([]);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      'https://cms.test/api/prevalences?pagination[pageSize]=1',
      'https://cms.test/api/matrices?pagination[pageSize]=1',
    ]);
    for (const [, init] of fetch.mock.calls) {
      expect(init.method).toBe('GET');
      expect(Object.keys(init.headers).map((h) => h.toLowerCase())).not.toContain('authorization');
    }
  });

  it('reports each non-200 collection with its status', async () => {
    const fetch = respond((c) => (c === 'matrices' ? 500 : 200));

    expect(await run(fetch)).toEqual([
      { collection: 'matrices', url: 'https://cms.test/api/matrices?pagination[pageSize]=1', status: 500 },
    ]);
  });

  it('reports network errors as the status', async () => {
    const fetch = respond((c) => (c === 'prevalences' ? new TypeError('fetch failed') : 200));

    expect((await run(fetch)).map((f) => f.status)).toEqual(['fetch failed']);
  });

  it('retries only failing collections until they pass or the wait runs out', async () => {
    let matricesCalls = 0;
    const flaky = respond((c) => (c === 'matrices' && ++matricesCalls < 3 ? 502 : 200));

    expect(await run(flaky, { waitMs: 60_000, intervalMs: 10_000 })).toEqual([]);
    expect(flaky.mock.calls.filter(([u]) => u.includes('prevalences'))).toHaveLength(1);

    const down = respond(() => 404);
    const failures = await run(down, { waitMs: 30_000, intervalMs: 10_000 });

    expect(failures.map((f) => f.status)).toEqual([404, 404]);
    expect(down).toHaveBeenCalledTimes(2 * 4); // t = 0, 10s, 20s, 30s
  });

  it('makes a single pass when no wait is given', async () => {
    const fetch = respond(() => 403);

    await run(fetch);

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('formatReport', () => {
  it('lists each failing collection and its status as markdown', () => {
    const report = formatReport('https://cms.test/api', [
      { collection: 'matrices', url: 'https://cms.test/api/matrices?pagination[pageSize]=1', status: 500 },
    ]);

    expect(report).toContain('https://cms.test/api');
    expect(report).toContain('| `matrices` | 500 |');
  });

  it('says so when everything passed', () => {
    expect(formatReport('https://cms.test/api', [])).toMatch(/all .*returned 200/i);
  });
});
