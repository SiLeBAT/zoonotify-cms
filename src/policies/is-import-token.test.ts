import { describe, it, expect } from 'vitest';
import isImportToken from './is-import-token';

/** A policy context as Strapi's content-API token strategy leaves it after authenticating. */
const authenticatedBy = (strategyName: string, tokenType: string) => ({
  state: {
    auth: {
      strategy: { name: strategyName },
      credentials: { type: tokenType },
    },
  },
});

const run = (policyContext: unknown): boolean =>
  isImportToken(policyContext, undefined, { strapi: {} });

describe('is-import-token policy', () => {
  it('lets the Custom Import token through, as Strapi 5 authenticates it', () => {
    expect(run(authenticatedBy('content-api-token', 'custom'))).toBe(true);
  });

  it.each(['full-access', 'read-only'])(
    'refuses a %s token, which could otherwise wipe the data',
    (type) => {
      expect(run(authenticatedBy('content-api-token', type))).toBe(false);
    },
  );

  it('refuses a request no strategy authenticated', () => {
    expect(run({ state: {} })).toBe(false);
  });

  it('refuses credentials from any other strategy, e.g. a users-permissions login', () => {
    expect(run(authenticatedBy('users-permissions', 'custom'))).toBe(false);
  });
});
