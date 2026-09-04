import { loadEnv } from 'vite'

/**
 * Fail the PRODUCTION BUILD when a required VITE_ variable is missing.
 *
 * Vite bakes these at build time, so a forgotten one cannot be noticed at boot,
 * only by a visitor. This shipped exactly that way once: apps/vacancies had no
 * .env.production, so the bundle baked a relative API base, the board asked its
 * OWN origin for /api/v1/board/meta, and nginx's SPA fallback answered with
 * index.html under HTTP 200. Every request was green in devtools while the page
 * showed a load error, because a 200 full of HTML is indistinguishable from a
 * working API until something tries to parse it.
 *
 * A missing variable is a deploy mistake, and a deploy mistake belongs in the
 * build log — not in a support conversation three days later. Development is
 * untouched: `vite dev` proxies /api, so a blank base is correct there.
 *
 * Shared by all four apps rather than copied into each vite.config, so the rule
 * has one definition and adding a required variable is one edit.
 */
export function requireEnv(keys) {
  return {
    name: 'reserva:require-env',
    // `config` runs before anything is bundled, so the failure is immediate
    // rather than after a minute of transforming.
    config(config, { command, mode }) {
      if (command !== 'build' || mode !== 'production') return

      const env = loadEnv(mode, config.root ?? process.cwd(), 'VITE_')
      const problems = []

      for (const key of keys) {
        const value = env[key]?.trim()
        if (!value) {
          problems.push(`  ${key} is not set`)
          continue
        }
        // A relative value is the specific mistake that failed silently, so it
        // is rejected by name: these apps are served from a different host than
        // the API, and their own host answers 200 for every unknown path.
        if (!/^https?:\/\//i.test(value)) {
          problems.push(`  ${key}="${value}" is not an absolute http(s) URL`)
        }
      }

      if (!problems.length) return

      throw new Error(
        [
          '',
          `Production build blocked — missing or invalid build-time environment:`,
          ...problems,
          '',
          `Set them in ${config.root ?? process.cwd()}/.env.production (committed;`,
          `these hold only public values) and build again.`,
          '',
        ].join('\n'),
      )
    },
  }
}
