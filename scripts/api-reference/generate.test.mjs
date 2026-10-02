import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generate, OUTPUT_PATH } from './generate.mjs';

describe('generate (real content-type schemas)', () => {
  const json = generate();
  const spec = JSON.parse(json);

  it('documents exactly the 15 Public Data API collections, GET find + findOne only', () => {
    const paths = Object.keys(spec.paths);

    expect(paths).toHaveLength(30);
    for (const item of Object.values(spec.paths)) expect(Object.keys(item)).toEqual(['get']);
    expect(paths.filter((p) => !p.endsWith('{documentId}'))).toEqual([
      '/prevalences',
      '/resistances',
      '/multi-resistances',
      '/microorganisms',
      '/matrices',
      '/matrix-groups',
      '/matrix-details',
      '/sample-origins',
      '/super-category-sample-origins',
      '/sampling-stages',
      '/sample-types',
      '/species',
      '/antimicrobial-substances',
      '/antibiotics',
      '/resistance-tables',
    ]);
  });

  it('leaves out private attributes and excluded collections', () => {
    expect(json).not.toMatch(/"dbId"|"zomoProgram"|"isolates"|\/isolates/);
    expect(spec.components.schemas).not.toHaveProperty('Isolate');
  });

  it('is deterministic', () => {
    expect(generate()).toBe(json);
  });

  it('matches the committed api-reference/openapi.json', () => {
    expect(readFileSync(OUTPUT_PATH, 'utf8').replace(/\r\n/g, '\n')).toBe(json);
  });
});
