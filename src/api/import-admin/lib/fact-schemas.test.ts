import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The xlsx-managed fact collections. Every fact sheet of the source workbook
// carries `Datum der Datenextraktion` (zn1934), which the Import CLI sends as
// `dataExtractionDate` (YYYY-MM-DD); the content type must be able to store it.
const FACT_COLLECTIONS = [
  'resistance',
  'prevalence',
  'multi-resistance',
  'esbl-ampc-gene-result',
  'typing-result',
];

describe('xlsx-managed fact schemas', () => {
  it.each(FACT_COLLECTIONS)('%s stores the data extraction date as a date', (name) => {
    const schemaPath = join(__dirname, '..', '..', name, 'content-types', name, 'schema.json');
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    expect(schema.attributes.dataExtractionDate).toEqual({ type: 'date' });
  });
});
