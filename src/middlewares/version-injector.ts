/**
 * `version-injector` middleware
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Strapi as StrapiType } from '@strapi/types/dist/core';
import { version } from './../../package.json';

// Written by the QA deploy, next to the .env in the app root. A dedicated file
// rather than an .env entry: appending to .env risks gluing onto a credential
// line that has no trailing newline, which fails silently.
const STAMP_FILE = '.commit-hash';

/**
 * Short hash of the running commit. The QA deploy stamps it into .commit-hash;
 * local dev reads it from the working copy. Production gets neither, so
 * released deployments report the package version.
 * Returns '' when the hash cannot be determined.
 */
function resolveCommitHash(): string {
  // Escape hatch for manual runs; not used by any deploy.
  if (process.env.CMS_COMMIT_HASH) {
    return process.env.CMS_COMMIT_HASH.trim();
  }
  try {
    const stamped = readFileSync(join(process.cwd(), STAMP_FILE), 'utf8').trim();
    if (stamped) {
      return stamped;
    }
  } catch {
    // Not a stamped deployment; fall through.
  }
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

// Resolved once at load; the commit cannot change while the process runs.
const commitHash = resolveCommitHash();

export default (config: any, { strapi }: { strapi: StrapiType }) => {
  return async (ctx: any, next: () => Promise<any>) => {
    await next();
    ctx.set('cms-version', version);
    if (commitHash) {
      ctx.set('cms-commit', commitHash);
    }
    ctx.set(
      'Access-Control-Expose-Headers',
      commitHash ? 'cms-version, cms-commit' : 'cms-version'
    );
  };
};

