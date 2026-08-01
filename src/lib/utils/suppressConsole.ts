/**
 * suppressConsole.ts
 *
 * Silences all browser console output when NEXT_PUBLIC_ENV_TYPE=prod.
 * Import this file once at the root layout so it runs before anything else.
 * Works client-side only (typeof window check guards SSR).
 */

if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_ENV_TYPE === "prod"
) {
  const noop = () => {};
  window.console.log   = noop;
  window.console.info  = noop;
  window.console.warn  = noop;
  window.console.error = noop;
  window.console.debug = noop;
  window.console.trace = noop;
  window.console.table = noop;
  window.console.group = noop;
  window.console.groupCollapsed = noop;
  window.console.groupEnd = noop;
  window.console.time  = noop;
  window.console.timeEnd = noop;
  window.console.timeLog = noop;
  window.console.count = noop;
  window.console.countReset = noop;
  window.console.assert = noop;
  window.console.dir   = noop;
  window.console.dirxml = noop;
}
