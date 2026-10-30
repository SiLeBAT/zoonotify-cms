// Guards against mismatched @strapi/* versions, which once pulled in two @strapi/utils copies and
// made forbidden requests answer 500 instead of 403. Run as `yarn check:strapi-versions`.
import { readFileSync } from 'node:fs';
import { checkStrapiVersions } from './check.mjs';

const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

const problems = checkStrapiVersions(read('package.json'), read('yarn.lock'));
if (problems.length > 0) {
  for (const problem of problems) console.error(`::error::${problem}`);
  process.exit(1);
}
console.log('@strapi/* versions are consistent.');
