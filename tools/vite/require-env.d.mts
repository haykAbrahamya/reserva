import type { Plugin } from 'vite'

/**
 * Fail the production build when a required VITE_ variable is missing or is not
 * an absolute http(s) URL. Development is unaffected.
 *
 * Hand-written beside the .mjs rather than emitted, because each app's
 * vite.config.ts is typechecked by `tsc -b` and would otherwise reject the
 * untyped import. Keeping the plugin as plain .mjs is deliberate: a vite config
 * must load before any build step has run, so it cannot depend on compiled
 * output.
 */
export declare function requireEnv(keys: readonly string[]): Plugin
