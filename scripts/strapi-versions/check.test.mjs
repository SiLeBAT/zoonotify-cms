import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkStrapiVersions } from './check.mjs';

const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

describe('checkStrapiVersions', () => {
  it("passes on today's package.json and yarn.lock", () => {
    expect(checkStrapiVersions(read('package.json'), read('yarn.lock'))).toEqual([]);
  });

  it('fails when the @strapi/* dependencies pin different versions, naming each package', () => {
    const packageJson = JSON.stringify({
      dependencies: {
        '@strapi/plugin-users-permissions': '5.54.0',
        '@strapi/strapi': '5.59.0',
        pg: '8.23.1',
      },
      devDependencies: { '@strapi/provider-email-nodemailer': '5.59.0' },
    });

    const problems = checkStrapiVersions(packageJson, oneUtilsLock);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('@strapi/plugin-users-permissions 5.54.0');
    expect(problems[0]).toContain('@strapi/strapi 5.59.0');
    expect(problems[0]).toContain('@strapi/provider-email-nodemailer 5.59.0');
    expect(problems[0]).not.toContain('pg');
  });

  it('fails when yarn.lock resolves two @strapi/utils versions, naming both', () => {
    const packageJson = JSON.stringify({ dependencies: { '@strapi/strapi': '5.59.0' } });
    const lock = `${oneUtilsLock}
"@strapi/utils@5.54.0", "@strapi/utils@^5.0.0":
  version "5.54.0"
  resolved "https://registry.yarnpkg.com/@strapi/utils/-/utils-5.54.0.tgz"

"@strapi/utils-extra@1.0.0":
  version "1.0.0"
`;

    const problems = checkStrapiVersions(packageJson, lock);

    expect(problems).toEqual([
      'yarn.lock: expected exactly one @strapi/utils version, found: 5.59.0, 5.54.0',
    ]);
  });
});

const oneUtilsLock = `# yarn lockfile v1


"@strapi/utils@5.59.0":
  version "5.59.0"
  resolved "https://registry.yarnpkg.com/@strapi/utils/-/utils-5.59.0.tgz"
`;
