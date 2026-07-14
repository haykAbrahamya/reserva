/**
 * Static prerender (SSG) for the public marketing routes + every
 * marketplace-listed partner page.
 *
 * Runs after the client + SSR Vite builds. For each route it:
 *   1. renders the React tree to HTML (pure Node, no browser),
 *   2. injects the route's Armenian-default <head> (title / description /
 *      canonical / OG / JSON-LD) so crawlers get real per-page metadata at
 *      crawl time,
 *   3. writes dist/<route>/index.html.
 *
 * Partner pages (/p/<slug>) are additionally prerendered: the script fetches the
 * listed-salon list from the public API at build time and bakes a real <head>
 * (LocalBusiness JSON-LD + a crawlable text summary) per partner, so Google can
 * index each salon by name without executing the SPA's runtime data fetch.
 *
 * The build never fails on a prerender error: a failing route falls back to the
 * untouched SPA shell, so the deployable is always produced. If the API is
 * unreachable at build time, partner prerender is skipped (statics still build).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const distDir = resolve(root, 'dist')
const ssrEntry = resolve(root, 'dist-ssr/entry-server.js')

// Build a FAQPage JSON-LD from the Armenian bundle so the rich-result schema is
// in the static HTML (not just injected later by JS) for the home route.
function faqJsonLd() {
  try {
    const hy = JSON.parse(readFileSync(resolve(root, 'src/i18n/locales/hy.json'), 'utf-8'))
    const items = hy.faq?.items
    if (!items) return ''
    const data = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: Object.values(items).map((it) => ({
        '@type': 'Question',
        name: it.q,
        acceptedAnswer: { '@type': 'Answer', text: it.a },
      })),
    }
    return `\n    <script type="application/ld+json">${JSON.stringify(data)}</script>\n  `
  } catch {
    return ''
  }
}

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

// Public API base for the build-time partner fetch. Overridable so CI can point
// at staging; defaults to production.
const API_BASE =
  process.env.PRERENDER_API_URL ||
  process.env.VITE_API_URL ||
  'https://api.reserva.am/api/v1'

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Armenian partner title/description, mirroring src/i18n/locales/hy.json seo.partner. */
function partnerMeta(salon) {
  const name = salon.name || 'Reserva'
  const cats = (salon.categories || []).slice(0, 4).join(', ')
  const title = `${name} — Ամրագրեք առցանց | Reserva`
  const base = `Ամրագրեք ժամ ${name}-ում առցանց՝ վայրկյանների ընթացքում։ Տեսեք ծառայությունները, գները և մասնագետներին։`
  const description = (cats ? `${base} ${cats}։` : base).slice(0, 200)
  return { title, description }
}

/** LocalBusiness JSON-LD for a listed salon — matches the runtime PartnerPage LD. */
function partnerJsonLd(salon) {
  const url = `${SITE}/p/${encodeURIComponent(salon.slug)}`
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    name: salon.name,
    url,
    ...(salon.tagline ? { description: String(salon.tagline).slice(0, 300) } : {}),
    ...(salon.logoUrl ? { image: absoluteUrl(salon.logoUrl) } : {}),
    ...(salon.rating > 0 && salon.reviews > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: salon.rating,
            reviewCount: salon.reviews,
          },
        }
      : {}),
    ...(Array.isArray(salon.locations) && salon.locations.length
      ? {
          address: salon.locations
            .filter((l) => l.address)
            .map((l) => ({ '@type': 'PostalAddress', streetAddress: l.address, addressCountry: 'AM' })),
        }
      : {}),
    ...(Array.isArray(salon.categories) && salon.categories.length
      ? {
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Services',
            itemListElement: salon.categories.slice(0, 20).map((c) => ({
              '@type': 'OfferCatalog',
              name: c,
            })),
          },
        }
      : {}),
  }
  return ld
}

/** Make a possibly-relative uploads path absolute against the API origin. */
function absoluteUrl(u) {
  if (!u) return u
  if (/^https?:\/\//i.test(u)) return u
  try {
    return new URL(u, API_BASE.replace(/\/api\/v1\/?$/, '')).href
  } catch {
    return u
  }
}

/** A small, crawlable text block baked into the partner page body so Google has
 *  real on-page content (name + categories + addresses) even before JS runs. */
function partnerSeoBody(salon) {
  const cats = (salon.categories || []).map((c) => `<li>${esc(c)}</li>`).join('')
  const addrs = (salon.locations || [])
    .filter((l) => l.address)
    .map((l) => `<li>${esc(l.address)}</li>`)
    .join('')
  return (
    `<div id="seo-content" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">` +
    `<h1>${esc(salon.name)}</h1>` +
    (salon.tagline ? `<p>${esc(salon.tagline)}</p>` : '') +
    (cats ? `<h2>Ծառայություններ</h2><ul>${cats}</ul>` : '') +
    (addrs ? `<h2>Հասցե</h2><ul>${addrs}</ul>` : '') +
    `</div>`
  )
}

/** Fetch marketplace-listed salons from the public API (build-time). */
async function fetchListedSalons() {
  const url = `${API_BASE.replace(/\/$/, '')}/public/salons`
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    // The transform interceptor wraps payloads as { data: [...] }.
    const list = Array.isArray(json) ? json : json?.data
    if (!Array.isArray(list)) throw new Error('unexpected payload shape')
    return list.filter((s) => s && s.slug)
  } catch (err) {
    console.warn(`[prerender] could not fetch salons from ${url} — skipping partner pages:`, err?.message)
    return []
  }
}

/**
 * Replace the title + key meta/canonical/OG tags in the HTML template.
 * `canonical` defaults to the trailing-slash form of `url` (matches what nginx
 * serves after the /route → /route/ redirect); pass one explicitly for partner
 * pages. Optional `jsonLd` is appended before </head>; optional `image` sets OG.
 */
function injectHead(html, url, meta, { canonical, jsonLd, image } = {}) {
  const href = canonical ?? `${SITE}${url === '/' ? '/' : `${url}/`}`
  // Tolerant of whitespace/newlines between attributes (the template formats
  // some <meta> tags across multiple lines).
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[\s\S]*?"\s*\/>/, `<meta name="description" content="${esc(meta.description)}" />`)
    .replace(/<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/>/, `<meta property="og:title" content="${esc(meta.title)}" />`)
    .replace(/<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/>/, `<meta property="og:description" content="${esc(meta.description)}" />`)
    .replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/, `<meta property="og:url" content="${href}" />`)
  if (image) {
    out = out
      .replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/, `<meta property="og:image" content="${esc(image)}" />`)
      .replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/, `<meta name="twitter:image" content="${esc(image)}" />`)
  }

  // The template intentionally ships NO static canonical/hreflang (a single
  // hardcoded canonical on every route caused "Alternate page" errors). But a
  // PRERENDERED page has its own real URL, so we inject a correct SELF-referential
  // canonical + hreflang here — each baked page points at itself, which is
  // exactly what Google wants. Runtime useSeo() re-affirms the same values.
  const HREFLANGS = ['hy', 'en', 'ru', 'x-default']
  const alternates = HREFLANGS.map(
    (l) => `    <link rel="alternate" hreflang="${l}" href="${href}" data-seo-hreflang />`,
  ).join('\n')
  const headTags =
    `\n    <link rel="canonical" href="${href}" />\n${alternates}\n` +
    (jsonLd ? `    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n` : '') +
    `  `
  out = out.replace('</head>', `${headTags}</head>`)
  return out
}

async function main() {
  if (!existsSync(ssrEntry)) {
    console.warn('[prerender] SSR bundle missing — skipping prerender (SPA shell kept).')
    return
  }
  const template = readFileSync(resolve(distDir, 'index.html'), 'utf-8')
  if (!template.includes('<div id="root"></div>')) {
    // A fresh `vite build` always emits an empty root; a filled one means this is
    // a re-run over an already-prerendered dist. Body injection would no-op, but
    // the <head> + </body> SEO block (the parts Google actually reads) still work.
    console.warn('[prerender] note: template root is not empty (re-run over prerendered dist).')
  }
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
      // Bake the FAQPage schema into the home page's static HTML.
      if (url === '/') {
        const ld = faqJsonLd()
        if (ld) html = html.replace('</head>', `${ld}</head>`)
      }
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

  // ── Partner pages (/p/<slug>) — marketplace-listed salons only ──
  // The API list endpoint already filters to marketplaceListed && active, so
  // unlisted/private partners are never prerendered or advertised to Google.
  const salons = await fetchListedSalons()
  if (!salons.length) {
    console.log('[prerender] no listed salons to prerender.')
    return
  }
  let ok = 0
  for (const salon of salons) {
    const url = `/p/${salon.slug}`
    try {
      const meta = partnerMeta(salon)
      const canonical = `${SITE}/p/${encodeURIComponent(salon.slug)}`
      let bodyHtml = ''
      try {
        bodyHtml = render(url)
      } catch {
        /* SPA shell is fine — the injected SEO body carries the crawlable text */
      }

      let html = injectHead(template, url, meta, {
        canonical,
        jsonLd: partnerJsonLd(salon),
        image: salon.logoUrl ? absoluteUrl(salon.logoUrl) : undefined,
      })
      if (bodyHtml) {
        html = html.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`)
      }
      // Bake a crawlable text summary (name + services + address) right before
      // </body> so Google indexes the salon regardless of whether the SPA body
      // rendered — injected at a fixed anchor, not the mutable root marker.
      const seoBody = partnerSeoBody(salon)
      html = html.replace('</body>', `${seoBody}</body>`)

      const outPath = resolve(distDir, `p/${salon.slug}/index.html`)
      mkdirSync(dirname(outPath), { recursive: true })
      writeFileSync(outPath, html)
      ok++
    } catch (err) {
      console.warn(`[prerender] skipped ${url}:`, err?.message)
    }
  }
  console.log(`[prerender] ✓ ${ok}/${salons.length} partner page(s) → dist/p/<slug>/index.html`)
}

main().catch((err) => {
  // Never fail the build over prerendering — the SPA shell is always valid.
  console.warn('[prerender] non-fatal error:', err?.message)
})
