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
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
// The mechanics (head rewriting, the crawlable block, writing dist/<route>) are
// shared with the vacancies board; only the routes, copy and structured data
// below are this app's.
import {
  esc,
  injectBody,
  injectHead as injectHeadTags,
  loadRender,
  sanitizeTemplate,
  seoBlock,
  writePage,
} from '../../../tools/prerender/inject.mjs'

// Curated SEO category landing pages — the SAME list the client route uses
// (src/lib/categories.ts imports this JSON too). Single source of truth.
const SEO_CATEGORIES = JSON.parse(
  readFileSync(fileURLToPath(new URL('../src/lib/categories.data.json', import.meta.url)), 'utf-8'),
)

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

/** Armenian partner title/description, mirroring src/i18n/locales/hy.json seo.partner. */
function partnerMeta(salon) {
  const name = salon.name || 'Reserva'
  const cats = (salon.categories || []).slice(0, 4).join(', ')
  const title = `${name} — Ամրագրեք առցանց | Reserva`
  const base = `Ամրագրեք ժամ ${name}-ում առցանց՝ վայրկյանների ընթացքում։ Տեսեք ծառայությունները, գները և մասնագետներին։`
  const description = (cats ? `${base} ${cats}։` : base).slice(0, 200)
  return { title, description }
}

/** LocalBusiness + BreadcrumbList JSON-LD for a listed salon (matches the
 *  runtime PartnerPage @graph). */
function partnerJsonLd(salon) {
  const url = `${SITE}/p/${encodeURIComponent(salon.slug)}`
  const geo = (salon.locations || []).find(
    (l) => typeof l.lat === 'number' && typeof l.lng === 'number',
  )
  const business = {
    '@type': 'HealthAndBeautyBusiness',
    '@id': `${url}#business`,
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
            .map((l) => ({ '@type': 'PostalAddress', streetAddress: l.address, addressLocality: 'Yerevan', addressCountry: 'AM' })),
        }
      : {}),
    ...(geo ? { geo: { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lng } } : {}),
    areaServed: { '@type': 'Country', name: 'Armenia' },
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
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Reserva', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Սրահներ', item: `${SITE}/salons` },
      { '@type': 'ListItem', position: 3, name: salon.name, item: url },
    ],
  }
  return { '@context': 'https://schema.org', '@graph': [business, breadcrumb] }
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
  return seoBlock(
    `<h1>${esc(salon.name)}</h1>` +
      (salon.tagline ? `<p>${esc(salon.tagline)}</p>` : '') +
      (cats ? `<h2>Ծառայություններ</h2><ul>${cats}</ul>` : '') +
      (addrs ? `<h2>Հասցե</h2><ul>${addrs}</ul>` : ''),
  )
}

/** CollectionPage + ItemList JSON-LD for the /salons directory. */
function salonsDirectoryJsonLd(salons) {
  const url = `${SITE}/salons`
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Սրահներ և ստուդիաներ',
    description:
      'Հայկական լավագույն սրահները, վարսավիրանոցներն ու գեղեցկության ստուդիաները — ամրագրեք ժամ առցանց։',
    url,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Reserva', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Սրահներ', item: url },
      ],
    },
    ...(salons.length
      ? {
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: salons.slice(0, 30).map((s, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `${SITE}/p/${encodeURIComponent(s.slug)}`,
              name: s.name,
            })),
          },
        }
      : {}),
  }
}

/** CollectionPage + BreadcrumbList JSON-LD for a category landing page. */
function categoryJsonLd(cat, salons) {
  const url = `${SITE}/salons/c/${cat.slug}`
  const matching = salons.filter((s) =>
    (s.categories || []).some((c) => String(c).toLowerCase().includes(cat.match.toLowerCase())),
  )
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: cat.h1,
    description: cat.description,
    url,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Reserva', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Սրահներ', item: `${SITE}/salons` },
        { '@type': 'ListItem', position: 3, name: cat.h1, item: url },
      ],
    },
    ...(matching.length
      ? {
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: matching.slice(0, 20).map((s, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `${SITE}/p/${encodeURIComponent(s.slug)}`,
              name: s.name,
            })),
          },
        }
      : {}),
  }
}

/** Crawlable text block for a category page: H1 + intro + matching salon links. */
function categorySeoBody(cat, salons) {
  const matching = salons.filter((s) =>
    (s.categories || []).some((c) => String(c).toLowerCase().includes(cat.match.toLowerCase())),
  )
  const items = matching
    .map((s) => `<li><a href="${SITE}/p/${encodeURIComponent(s.slug)}">${esc(s.name)}</a></li>`)
    .join('')
  return seoBlock(
    `<h1>${esc(cat.h1)}</h1><p>${esc(cat.intro)}</p>` + (items ? `<ul>${items}</ul>` : ''),
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
 * Per-route <head>, with this app's canonical convention.
 *
 * `canonical` defaults to the TRAILING-SLASH form of `url` — that is what nginx
 * serves after its /route -> /route/ redirect, and a sitemap or canonical that
 * disagrees with the served URL is reported as "Alternate page with proper
 * canonical tag". Partner and category pages pass their own.
 */
function injectHead(html, url, meta, { canonical, jsonLd, image } = {}) {
  return injectHeadTags(html, {
    canonical: canonical ?? `${SITE}${url === '/' ? '/' : `${url}/`}`,
    title: meta.title,
    description: meta.description,
    image,
    jsonLd,
  })
}

async function main() {
  const render = await loadRender(ssrEntry)
  if (!render) {
    console.warn('[prerender] SSR bundle missing — skipping prerender (SPA shell kept).')
    return
  }
  // Reset the shell first. Every injection below ADDS, so a re-run over an
  // already-prerendered dist used to leave the page with two canonicals, eight
  // hreflang alternates and the previous route's JSON-LD. On a fresh
  // `vite build` this is a no-op. See sanitizeTemplate.
  const template = sanitizeTemplate(readFileSync(resolve(distDir, 'index.html'), 'utf-8'))
  // Fetch the listed salons up front — used for partner pages, category pages,
  // AND the /salons directory's CollectionPage + ItemList structured data.
  const salons = await fetchListedSalons()

  for (const [url, meta] of Object.entries(ROUTES)) {
    try {
      let bodyHtml = ''
      try {
        bodyHtml = render(url)
      } catch (err) {
        console.warn(`[prerender] render failed for ${url} — using SPA shell:`, err?.message)
      }

      // /salons gets a CollectionPage + ItemList of listed salons baked in.
      const routeLd = url === '/salons' ? salonsDirectoryJsonLd(salons) : undefined
      let html = injectHead(template, url, meta, routeLd ? { jsonLd: routeLd } : undefined)
      // Bake the FAQPage schema into the home page's static HTML.
      if (url === '/') {
        const ld = faqJsonLd()
        if (ld) html = html.replace('</head>', `${ld}</head>`)
      }
      html = injectBody(html, bodyHtml)

      const outPath = writePage(distDir, url, html)
      console.log(`[prerender] ✓ ${url} → ${outPath.replace(distDir, 'dist')}`)
    } catch (err) {
      console.warn(`[prerender] skipped ${url}:`, err?.message)
    }
  }

  // ── Partner pages (/p/<slug>) — marketplace-listed salons only ──
  // (salons fetched once at the top of main(); the list endpoint already filters
  // to marketplaceListed && active, so unlisted partners are never prerendered.)
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
      html = injectBody(html, bodyHtml)
      // Bake a crawlable text summary (name + services + address) right before
      // </body> so Google indexes the salon regardless of whether the SPA body
      // rendered — injected at a fixed anchor, not the mutable root marker.
      html = html.replace('</body>', `${partnerSeoBody(salon)}</body>`)

      writePage(distDir, `/p/${salon.slug}`, html)
      ok++
    } catch (err) {
      console.warn(`[prerender] skipped ${url}:`, err?.message)
    }
  }
  console.log(`[prerender] ✓ ${ok}/${salons.length} partner page(s) → dist/p/<slug>/index.html`)

  // ── Category keyword landing pages (/salons/c/<slug>) ──
  // Prerendered regardless of salon count — they target generic Armenian search
  // terms (e.g. "Մատնահարդարում") and stay valuable even when a category is
  // temporarily empty.
  let catOk = 0
  for (const cat of SEO_CATEGORIES) {
    const url = `/salons/c/${cat.slug}`
    try {
      const meta = { title: `${cat.title} | Reserva`, description: cat.description }
      const canonical = `${SITE}/salons/c/${cat.slug}`
      let bodyHtml = ''
      try {
        bodyHtml = render(url)
      } catch {
        /* SPA shell is fine — the injected SEO body carries the crawlable text */
      }
      let html = injectHead(template, url, meta, {
        canonical,
        jsonLd: categoryJsonLd(cat, salons),
      })
      html = injectBody(html, bodyHtml)
      html = html.replace('</body>', `${categorySeoBody(cat, salons)}</body>`)

      writePage(distDir, `/salons/c/${cat.slug}`, html)
      catOk++
    } catch (err) {
      console.warn(`[prerender] skipped ${url}:`, err?.message)
    }
  }
  console.log(`[prerender] ✓ ${catOk}/${SEO_CATEGORIES.length} category page(s) → dist/salons/c/<slug>/index.html`)
}

main().catch((err) => {
  // Never fail the build over prerendering — the SPA shell is always valid.
  console.warn('[prerender] non-fatal error:', err?.message)
})
