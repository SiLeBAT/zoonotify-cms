export function checkStrapiVersions(packageJsonText, yarnLockText) {
  const problems = [];

  const { dependencies = {}, devDependencies = {} } = JSON.parse(packageJsonText);
  const pins = Object.entries({ ...dependencies, ...devDependencies }).filter(([name]) =>
    name.startsWith('@strapi/'),
  );
  if (new Set(pins.map(([, version]) => version)).size > 1) {
    problems.push(
      `package.json: @strapi/* dependencies must all pin the same version, found: ${pins
        .map(([name, version]) => `${name} ${version}`)
        .join(', ')}`,
    );
  }

  // A yarn v1 entry is a header listing its selectors, then an indented `version "x"` line.
  const utilsVersions = new Set(
    [...yarnLockText.matchAll(/^"?@strapi\/utils@[^\r\n]*:\r?\n\s+version "([^"]+)"/gm)].map(
      ([, version]) => version,
    ),
  );
  if (utilsVersions.size !== 1) {
    problems.push(
      `yarn.lock: expected exactly one @strapi/utils version, found: ${
        [...utilsVersions].join(', ') || 'none'
      }`,
    );
  }

  return problems;
}
