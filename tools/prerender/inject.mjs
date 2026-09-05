/**
 * Shared build-time prerender primitives.
 *
 * Both public apps ship as client-rendered SPAs, which means one HTML shell is
 * served for every route — so without a prerender step every page a crawler
 * fetches has the SAME title, the same description and no canonical of its own.
 * These helpers are what turn that one shell into a per-route static page:
 *
 *   injectHead  — rewrite the shell's <head> for one URL
 *   seoBlock    — a crawlable text block for the body
 *   loadRender  — the SSR bundle's render(), or null if it was not built
 *   writePage   — dist/<route>/index.html
 *
 * Extracted from apps/client/scripts/prerender.mjs when the vacancies board
 * needed the same treatment. The two apps' route lists, structured data and
 * copy are entirely their own; only the mechanics live here.
 *
 * Plain .mjs with no dependencies on purpose — this runs in the build, before
 * anything is bundled, in whatever Node the CI happens to have.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * Reset a shell that has already been prerendered.
 *
 * `vite build` emits a pristine shell, so on a clean build this changes
 * nothing. It matters when the script runs twice over the same dist — a CI
 * retry, a local re-run — because every injection here is an ADD: a second
 * pass would leave the page with two canonicals, eight hreflang alternates and
 * the previous route's structured data still attached. A page declaring two
 * different canonical URLs is worse than one declaring none, and it is the kind
 * of damage that is invisible until Search Console reports it weeks later.
 *
 * So the template is stripped back to a shell before anything is written to it,
 * which makes the whole step idempotent rather than merely usually-correct.
 */
export function sanitizeTemplate(html) {
  const stripped = html
    .replace(/\s*<link rel="canonical"[^>]*>/g, '')
    .replace(/\s*<link rel="alternate"[^>]*data-seo-hreflang[^>]*>/g, '')
    // Only the blocks THIS script wrote. A shell may ship structured data of
    // its own (the client's does: Organization, WebSite, SoftwareApplication),
    // and stripping by type alone would silently delete it.
    .replace(/\s*<script type="application\/ld\+json" data-seo-jsonld>[\s\S]*?<\/script>/g, '')
    .replace(/<div id="seo-content"[\s\S]*?<\/div>/g, '')
  return emptyRoot(stripped)
}

/**
 * Empty the app root, whatever is in it.
 *
 * Not a regex: server-rendered markup is full of nested <div>s, so a lazy match
 * would stop at the FIRST closing tag and leave the rest of the tree orphaned
 * in the page. Counting depth from the opening tag finds the real one.
 */
function emptyRoot(html) {
  const OPEN = '<div id="root">'
  const start = html.indexOf(OPEN)
  if (start === -1) return html

  let depth = 1
  let i = start + OPEN.length
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', i)
    const nextClose = html.indexOf('</div>', i)
    if (nextClose === -1) return html // malformed; leave it alone
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      i = nextOpen + 4
    } else {
      depth--
      i = nextClose + 6
    }
  }
  return html.slice(0, start) + '<div id="root"></div>' + html.slice(i)
}

/** Escape for an HTML attribute or text node. */
export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

/** The locales every page declares itself available in. */
export const HREFLANGS = ['hy', 'en', 'ru', 'x-default']

/**
 * Rewrite the shell's <head> for one route.
 *
 * The title/description/OG replacements are regexes rather than a template
 * placeholder so the shell stays a valid, previewable HTML file on its own —
 * and they tolerate whitespace between attributes, because the shells format
 * some <meta> tags across several lines.
 *
 * `jsonLdId` gives the baked structured data the SAME id the running app uses
 * for that slot. Without it the app appends its own copy on mount and the page
 * ends up asserting the same thing twice — which is not an error, but is a
 * signal to a crawler that nobody is in charge of the markup. With it, the
 * runtime finds the baked block and replaces or skips it.
 *
 * The canonical and hreflang are ADDED here rather than shipped in the shell.
 * A static canonical in the shell would make every crawled URL declare the home
 * page as its canonical, which is how a site ends up with one indexed page; a
 * prerendered page, by contrast, has a real URL of its own, so it gets a
 * self-referential canonical. All three locales are served from the same URL
 * (locale is a client-side preference, not a path), so every hreflang points at
 * that same canonical.
 */
export function injectHead(html, { canonical, title, description, image, jsonLd, jsonLdId }) {
  let out = html

  if (title != null) {
    out = out
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
      .replace(
        /<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/>/,
        `<meta property="og:title" content="${esc(title)}" />`,
      )
  }

  if (description != null) {
    out = out
      .replace(
        /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/>/,
        `<meta name="description" content="${esc(description)}" />`,
      )
      .replace(
        /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/>/,
        `<meta property="og:description" content="${esc(description)}" />`,
      )
  }

  out = out.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${canonical}" />`,
  )

  if (image) {
    out = out
      .replace(
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/,
        `<meta property="og:image" content="${esc(image)}" />`,
      )
      .replace(
        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/,
        `<meta name="twitter:image" content="${esc(image)}" />`,
      )
  }

  const alternates = HREFLANGS.map(
    (l) => `    <link rel="alternate" hreflang="${l}" href="${canonical}" data-seo-hreflang />`,
  ).join('\n')
  const headTags =
    `\n    <link rel="canonical" href="${canonical}" />\n${alternates}\n` +
    (jsonLd ? `    <script type="application/ld+json" data-seo-jsonld${jsonLdId ? ` id="${jsonLdId}"` : ''}>${JSON.stringify(jsonLd)}</script>\n` : '') +
    `  `

  return out.replace('</head>', `${headTags}</head>`)
}

/**
 * A crawlable text block for the body.
 *
 * Visually hidden but NOT display:none — a clipped block is read by crawlers
 * and by screen readers, where `display:none` is skipped by both. It carries
 * the same facts the rendered page shows once JS runs, so it is a fallback for
 * the render, never a place to put anything the visitor cannot also see.
 */
export function seoBlock(inner) {
  return (
    `<div id="seo-content" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">` +
    inner +
    `</div>`
  )
}

/** Insert the SSR markup into the shell's root, if there is any. */
export function injectBody(html, bodyHtml) {
  if (!bodyHtml) return html
  return html.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`)
}

/**
 * Load the SSR bundle's render().
 *
 * Returns null when the bundle is absent, so a build that skipped the SSR step
 * still produces a deployable dist — the injected head and SEO block are the
 * parts search engines actually read, and both work without it.
 */
export async function loadRender(ssrEntry) {
  if (!existsSync(ssrEntry)) return null
  const mod = await import(pathToFileURL(ssrEntry).href)
  return typeof mod.render === 'function' ? mod.render : null
}

/** Write dist/<route>/index.html (or dist/index.html for "/"). */
export function writePage(distDir, route, html) {
  const outPath =
    route === '/' ? resolve(distDir, 'index.html') : resolve(distDir, `.${route}/index.html`)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, html)
  return outPath
}
