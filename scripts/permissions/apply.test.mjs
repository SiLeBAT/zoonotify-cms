import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { applyManifest, refusalToApply } from './apply.mjs';

const surface = {
  contentTypes: [
    { uid: 'api::prevalence.prevalence', pluralName: 'prevalences', singularName: 'prevalence', kind: 'collectionType', localized: true },
    { uid: 'api::welcome.welcome', pluralName: 'welcomes', singularName: 'welcome', kind: 'singleType', localized: true },
  ],
  customRoutes: [{ handler: 'api::isolate.isolate.import', method: 'POST', path: '/isolates/import' }],
  plugins: ['users-permissions', 'upload'],
};

const entry = (actions) => ({ actions, consumers: [], reason: 'test' });

const manifest = {
  locales: ['de', 'en'],
  public: {
    contentTypes: { prevalences: entry(['find', 'findOne']), welcomes: entry(['find']) },
    customRoutes: { 'api::isolate.isolate.import': entry([]) },
    plugins: { 'users-permissions': entry([]), upload: entry([]) },
  },
  authenticated: { actions: [] },
  roles: ['Public', 'Authenticated'],
  signUps: false,
  importToken: { name: 'Import', type: 'custom', actions: [] },
};

/** An in-memory stand-in for the users-permissions tables. */
const memoryStore = ({ public: pub = [], authenticated = [], signUps = true } = {}) => {
  const grants = { public: new Set(pub), authenticated: new Set(authenticated) };
  let allowRegister = signUps;
  return {
    grants: async (role) => [...grants[role]].sort(),
    grant: async (role, actions) => actions.forEach((a) => grants[role].add(a)),
    revoke: async (role, actions) => actions.forEach((a) => grants[role].delete(a)),
    signUps: async () => allowRegister,
    setSignUps: async (on) => {
      allowRegister = on;
    },
  };
};

describe('applyManifest', () => {
  it('grants Public exactly the manifest set on an empty database and turns sign-ups off', async () => {
    const store = memoryStore();

    await applyManifest({ manifest, surface, store });

    expect(await store.grants('public')).toEqual([
      'api::prevalence.prevalence.find',
      'api::prevalence.prevalence.findOne',
      'api::welcome.welcome.find',
    ]);
    expect(await store.grants('authenticated')).toEqual([]);
    expect(await store.signUps()).toBe(false);
  });

  it('removes grants the manifest does not list, on Public and Authenticated, and reports the change', async () => {
    const store = memoryStore({
      public: [
        'api::prevalence.prevalence.find',
        'api::prevalence.prevalence.create',
        'plugin::users-permissions.auth.register',
      ],
      authenticated: ['plugin::users-permissions.user.me'],
    });

    const result = await applyManifest({ manifest, surface, store });

    expect(await store.grants('public')).toEqual([
      'api::prevalence.prevalence.find',
      'api::prevalence.prevalence.findOne',
      'api::welcome.welcome.find',
    ]);
    expect(await store.grants('authenticated')).toEqual([]);
    expect(result).toEqual({
      public: {
        added: ['api::prevalence.prevalence.findOne', 'api::welcome.welcome.find'],
        removed: ['api::prevalence.prevalence.create', 'plugin::users-permissions.auth.register'],
      },
      authenticated: { added: [], removed: ['plugin::users-permissions.user.me'] },
      signUpsTurnedOff: true,
    });
  });

  it('changes nothing on a database that already matches', async () => {
    const store = memoryStore({
      public: ['api::prevalence.prevalence.find', 'api::prevalence.prevalence.findOne', 'api::welcome.welcome.find'],
      signUps: false,
    });

    const result = await applyManifest({ manifest, surface, store });

    expect(result).toEqual({
      public: { added: [], removed: [] },
      authenticated: { added: [], removed: [] },
      signUpsTurnedOff: false,
    });
  });
});

describe('where apply runs', () => {
  const CMS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const filesUnder = (dir) =>
    readdirSync(join(CMS_ROOT, dir), { recursive: true, withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => join(d.parentPath, d.name));

  it('is never called from bootstrap, deploy scripts, the container or CI', () => {
    const files = [
      ...filesUnder('src'),
      ...filesUnder('.github'),
      ...['deploy.sh', 'backup.sh', 'Dockerfile', 'ecosystem.config.js', 'server.js'].map((f) => join(CMS_ROOT, f)),
    ];
    const callers = files.filter((file) => /permissions:apply|permissions\/apply/.test(readFileSync(file, 'utf8')));
    expect(callers).toEqual([]);
  });
});

describe('refusalToApply', () => {
  const dev = { NODE_ENV: 'development' };

  it('allows a development environment on the default SQLite database', () => {
    expect(refusalToApply(dev)).toBeNull();
  });

  it('allows a development environment on a loopback Postgres', () => {
    expect(refusalToApply({ ...dev, DATABASE_CLIENT: 'postgres', DATABASE_HOST: '127.0.0.1' })).toBeNull();
    expect(refusalToApply({ ...dev, DATABASE_CLIENT: 'postgres', DATABASE_URL: 'postgres://u:p@localhost:5432/strapi' })).toBeNull();
  });

  it('refuses when NODE_ENV is not explicitly development', () => {
    expect(refusalToApply({})).toMatch(/NODE_ENV/);
    expect(refusalToApply({ NODE_ENV: 'production' })).toMatch(/NODE_ENV is "production"/);
  });

  it('refuses a database on another host, without printing its credentials', () => {
    const remote = refusalToApply({ ...dev, DATABASE_CLIENT: 'postgres', DATABASE_HOST: 'db.bfr.berlin' });
    expect(remote).toMatch(/db\.bfr\.berlin/);

    const byUrl = refusalToApply({ ...dev, DATABASE_CLIENT: 'postgres', DATABASE_URL: 'postgres://u:secret@db.bfr.berlin/strapi' });
    expect(byUrl).toMatch(/db\.bfr\.berlin/);
    expect(byUrl).not.toMatch(/secret/);
  });

  it('refuses a database client it cannot tell is local', () => {
    expect(refusalToApply({ ...dev, DATABASE_CLIENT: 'mssql' })).toMatch(/mssql/);
  });
});
