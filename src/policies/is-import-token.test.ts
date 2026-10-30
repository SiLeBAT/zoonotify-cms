import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { errors } from '@strapi/utils';
import isImportToken from './is-import-token';

// The policy reads config/permissions.mjs from the app root, as Strapi reports it.
const strapi = { dirs: { app: { root: path.resolve(__dirname, '../..') } } };

const IMPORT_ACTIONS = [
  'api::import-admin.import-admin.truncate',
  'api::import-admin.import-admin.bulkCreate',
  'api::import-admin.import-admin.recordImport',
];

type Token = { name?: string; type?: string; permissions?: string[] };

/** The Import token as config/permissions.mjs describes it. */
const importToken = (overrides: Token = {}): Token => ({
  name: 'Import',
  type: 'custom',
  permissions: IMPORT_ACTIONS,
  ...overrides,
});

/** A policy context as Strapi's content-API token strategy leaves it after authenticating. */
const authenticatedBy = (strategyName: string, credentials: Token) => ({
  state: { auth: { strategy: { name: strategyName }, credentials } },
});

const run = async (policyContext: unknown) => isImportToken(policyContext, undefined, { strapi });

const expectRefused = async (policyContext: unknown, reason?: RegExp) => {
  const result = run(policyContext);
  await expect(result).rejects.toBeInstanceOf(errors.PolicyError);
  if (reason) await expect(result).rejects.toThrow(reason);
};

describe('is-import-token policy', () => {
  it('lets the Import token through, as Strapi 5 authenticates it', async () => {
    expect(await run(authenticatedBy('content-api-token', importToken()))).toBe(true);
  });

  it('does not care about the order Strapi lists the grants in', async () => {
    const reversed = importToken({ permissions: [...IMPORT_ACTIONS].reverse() });
    expect(await run(authenticatedBy('content-api-token', reversed))).toBe(true);
  });

  it.each(['full-access', 'read-only'])(
    'refuses a %s token, which could otherwise wipe the data',
    async (type) => {
      await expectRefused(
        authenticatedBy('content-api-token', importToken({ type, permissions: [] })),
        /custom/,
      );
    },
  );

  it('refuses a custom token with another name, even with the same grants', async () => {
    await expectRefused(authenticatedBy('content-api-token', importToken({ name: 'Import 2' })), /Import 2/);
  });

  it('refuses an Import token that lost one of its grants', async () => {
    const missing = importToken({ permissions: IMPORT_ACTIONS.slice(0, 2) });
    await expectRefused(authenticatedBy('content-api-token', missing), /recordImport/);
  });

  it('refuses an Import token that was given an extra grant', async () => {
    const extra = importToken({ permissions: [...IMPORT_ACTIONS, 'api::isolate.isolate.find'] });
    await expectRefused(authenticatedBy('content-api-token', extra), /api::isolate\.isolate\.find/);
  });

  it('refuses a request no strategy authenticated', async () => {
    await expectRefused({ state: {} });
  });

  it('refuses credentials from any other strategy, e.g. a users-permissions login', async () => {
    await expectRefused(authenticatedBy('users-permissions', importToken()));
  });
});
