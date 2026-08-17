/**
 * `version-injector` middleware
 */

import { execSync } from 'child_process';
import type { Strapi as StrapiType } from '@strapi/types/dist/core';
import { version } from './../../package.json';

/**
 * Short hash of the running commit. The QA deploy writes CMS_COMMIT_HASH into
 * .env; local dev reads it from the working copy. Production deliberately gets
 * neither, so released deployments report the package version.
 * Returns '' when git is unavailable or this is not a checkout.
 */
function resolveCommitHash(): string {
  if (process.env.CMS_COMMIT_HASH) {
    return process.env.CMS_COMMIT_HASH;
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

