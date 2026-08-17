/**
 * `nan-filter-tracer` — TEMPORARY DIAGNOSTIC. Safe to delete once the
 * "Expected a valid Number, got NaN" source is identified.
 *
 * That error is thrown by @strapi/database `NumberField.toDB` (number.js:24 —
 * the *string* branch) while casting a `where` value for a numeric column. The
 * line number matters: the string branch means the offending value was the
 * literal string "NaN", not `undefined` (which toDB passes through untouched)
 * and not a raw NaN number (that throws from the number branch instead).
 *
 * The production stack shows only @strapi/database frames, so the call site is
 * behind a promise boundary and the async stack is lost. This middleware
 * restores the missing attribution from both possible directions:
 *
 *   1. HTTP origin  — logs the full method + URL + parsed query of any request
 *                     whose handler throws, then rethrows unchanged.
 *   2. Background   — process-level handlers attribute an unhandled rejection
 *                     or uncaught exception that no request is responsible for
 *                     (e.g. the floating `saveResistanceRecord(...)` promise in
 *                     src/data_import/cut-off.import.ts:276, which outlives
 *                     bootstrap and can surface at any time after boot).
 *
 * Whichever prefix appears in the log next to the stack tells you which one it is.
 */

import type { Strapi as StrapiType } from '@strapi/types/dist/core';

const MARKER = '[nan-tracer]';

let processHandlersInstalled = false;

/** Install once per process — the middleware factory runs on every boot. */
function installProcessHandlers(): void {
  if (processHandlersInstalled) {
    return;
  }
  processHandlersInstalled = true;

  process.on('unhandledRejection', (reason: any) => {
    console.error(
      `${MARKER} UNHANDLED REJECTION (no request responsible — background work):`,
      reason?.stack ?? reason
    );
  });

  process.on('uncaughtException', (error: any) => {
    console.error(`${MARKER} UNCAUGHT EXCEPTION:`, error?.stack ?? error);
  });
}

export default (config: any, { strapi }: { strapi: StrapiType }) => {
  installProcessHandlers();

  return async (ctx: any, next: () => Promise<any>) => {
    try {
      await next();
    } catch (error: any) {
      // Log the request that produced it, then rethrow so `strapi::errors`
      // still formats the response exactly as it does today.
      console.error(
        `${MARKER} REQUEST FAILED ${ctx.method} ${ctx.originalUrl}\n` +
          `${MARKER}   parsed query: ${JSON.stringify(ctx.query)}\n` +
          `${MARKER}   error: ${error?.message ?? error}`
      );
      console.error(error?.stack ?? error);
      throw error;
    }
  };
};
