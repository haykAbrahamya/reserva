/**
 * Static prerender (SSG) for the public marketing routes.
 *
 * Runs after the client + SSR Vite builds. For each route it:
 *   1. renders the React tree to HTML (pure Node, no browser),
 *   2. injects the route's Armenian-default <head> (title / description /
 *      canonical / OG) so crawlers get real per-page metadata at crawl time,
 *   3. writes dist/<route>/index.html.
 *
 * Only apex marketing routes are prerendered — partner booking pages depend on
 * host/runtime data and stay client-rendered via the SPA fallback.
 *
 * The build never fails on a prerender error: a failing route falls back to the
 * untouched SPA shell, so the deployable is always produced.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const distDir = resolve(root, 'dist')
const ssrEntry = resolve(root, 'dist-ssr/entry-server.js')

// Armenian-default head per route (matches src/i18n/locales/hy.json → seo.*).
// Visitors still get localized titles live via useSeo; this is the crawl-time
// baseline Google reads before JS runs.
const SITE = 'https://reserva.am'
const ROUTES = {
  '/': {
    title: 'Reserva — Առցանց ամրագրման հարթակ Հայաստանում',
    description:
      'Առցանց ամրագրման հարթակ հայկական սրահների, վարսավիրանոցների և գեղեցկության ստուդիաների համար։ Ընդունեք ամրագրումներ շուրջօրյա՝ առանց զանգերի։',
  },
  '/salons': {
    title: 'Սրահներ և ստուդիաներ — Ամրագրեք առցանց | Reserva',
    description:
      'Գտեք հայկական լավագույն սրահները, վարսավիրանոցներն ու գեղեցկության ստուդիաները և ամրագրեք ժամ առցանց՝ վայրկյանների ընթացքում։',
  },
  '/signup': {
    title: 'Սկսել անվճար — Ձեր սրահի ամրագրման էջը | Reserva',
    description:
      'Ստեղծեք ձեր սրահի առցանց ամրագրման էջը Reserva-ով։ 1 ամիս անվճար փորձաշրջան՝ առանց քարտի։',
  },
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Replace the title + key meta/canonical/OG tags in the HTML template. */
function injectHead(html, url, meta) {
  // Use the trailing-slash form for sub-routes so the page's self-declared
  // canonical matches the URL nginx actually serves (/salons → 301 /salons/).
  const canonical = `${SITE}${url === '/' ? '/' : `${url}/`}`
  // Tolerant of whitespace/newlines between attributes (the template formats
  // some <meta> tags across multiple lines).
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[\s\S]*?"\s*\/>/, `<meta name="description" content="${esc(meta.description)}" />`)
    .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/>/, `<meta property="og:title" content="${esc(meta.title)}" />`)
    .replace(/<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/>/, `<meta property="og:description" content="${esc(meta.description)}" />`)
    .replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`)
  return out
}

async function main() {
  if (!existsSync(ssrEntry)) {
    console.warn('[prerender] SSR bundle missing — skipping prerender (SPA shell kept).')
    return
  }
  const template = readFileSync(resolve(distDir, 'index.html'), 'utf-8')
  const { render } = await import(pathToFileURL(ssrEntry).href)

  for (const [url, meta] of Object.entries(ROUTES)) {
    try {
      let bodyHtml = ''
      try {
        bodyHtml = render(url)
      } catch (err) {
        console.warn(`[prerender] render failed for ${url} — using SPA shell:`, err?.message)
      }

      let html = injectHead(template, url, meta)
      if (bodyHtml) {
        html = html.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`)
      }

      const outPath =
        url === '/'
          ? resolve(distDir, 'index.html')
          : resolve(distDir, `.${url}/index.html`)
      mkdirSync(dirname(outPath), { recursive: true })
      writeFileSync(outPath, html)
      console.log(`[prerender] ✓ ${url} → ${outPath.replace(distDir, 'dist')}`)
    } catch (err) {
      console.warn(`[prerender] skipped ${url}:`, err?.message)
    }
  }
}

main().catch((err) => {
  // Never fail the build over prerendering — the SPA shell is always valid.
  console.warn('[prerender] non-fatal error:', err?.message)
})
