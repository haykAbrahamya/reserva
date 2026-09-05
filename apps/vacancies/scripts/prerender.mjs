/**
 * Static prerender (SSG) for the board and its keyword landing pages.
 *
 * Runs after the client + SSR Vite builds. For each route it renders the React
 * tree to HTML in pure Node, rewrites the shell's <head> for that URL, bakes a
 * crawlable text block into the body, and writes dist/<route>/index.html.
 *
 * WHY, for a board whose whole value is that it is fresh:
 *
 * Search engines do execute JavaScript, but they execute it late and not
 * always. A brand-new job board competing for "վարսավիրի աշխատանք" cannot
 * afford for its category pages to be a shared empty shell until a render queue
 * gets to them — every one of them would look like the same page with the same
 * title. What is baked in here is the STABLE half: the heading, the copy, the
 * canonical, the structured data, the links. The listings stay live and arrive
 * when the app mounts, because those are the half that must never be stale.
 *
 * Individual listings (/v/<id>) are deliberately NOT prerendered. A file
 * written at build time would keep describing a position after it was filled,
 * and a stale job posting is a policy problem as well as a bad result. They are
 * discovered through the sitemap the API serves, which is generated per request
 * and can never advertise a closed listing.
 *
 * The build never fails on a prerender error: a failing route falls back to the
 * untouched SPA shell, so the deployable is always produced.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  esc,
  injectBody,
  injectHead,
  loadRender,
  sanitizeTemplate,
  seoBlock,
  writePage,
} from '../../../tools/prerender/inject.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const distDir = resolve(root, 'dist')
const ssrEntry = resolve(root, 'dist-ssr/entry-server.js')

const SITE = process.env.VACANCIES_SITE_URL || 'https://vacancies.reserva.am'

// The curated landing list — the SAME file the /jobs/:slug route imports, so a
// page can never exist in one place and not the other.
const LANDINGS = JSON.parse(
  readFileSync(resolve(root, 'src/lib/landings.data.json'), 'utf-8'),
)

// Armenian is what a first-time visitor sees, so Armenian is the crawl-time
// baseline. Visitors still get their own language live, via useSeo.
const LOCALE = 'hy'
const hy = JSON.parse(readFileSync(resolve(root, 'src/i18n/locales/hy.json'), 'utf-8'))

const BRAND = `${hy.app.name} ${hy.app.product}`

/** Public API base for the build-time listing fetch. Overridable so CI can
 *  point at staging; defaults to production. */
const API_BASE =
  process.env.PRERENDER_API_URL || process.env.VITE_API_URL || 'https://api.reserva.am/api/v1'

/** A landing page's route — the trailing slash is load-bearing, see
 *  landingPath() in src/lib/landings.ts. */
const routeFor = (slug) => `/jobs/${slug}/`
const canonicalOf = (route) => `${SITE}${route}`

/** The board's own page-size ceiling (see BoardQueryDto). Asking for more is a
 *  400, not a larger page. */
const API_PAGE_SIZE = 48

/** Stop after this many pages. A guard against an unbounded build, not a
 *  product limit — well past any board this text block needs to describe. */
const MAX_PAGES = 10

/**
 * Every live listing, once, for the whole build.
 *
 * Fetched here rather than per landing page: filtering in memory means sixteen
 * landing pages cost a handful of round trips instead of sixteen. If the API is
 * unreachable the pages still build — they simply carry their copy without the
 * listing links, which is the correct degradation for a step that adds
 * discovery rather than content.
 */
async function fetchListings() {
  const base = `${API_BASE.replace(/\/$/, '')}/board/vacancies`
  const all = []
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `${base}?page=${page}&pageSize=${API_PAGE_SIZE}`
      const res = await fetch(url, { headers: { accept: 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      const json = await res.json()
      // The transform interceptor wraps payloads as { data: {...} }.
      const payload = json?.data ?? json
      const items = payload?.items
      if (!Array.isArray(items)) throw new Error('unexpected payload shape')
      all.push(...items)
      if (all.length >= (payload.total ?? all.length) || items.length === 0) break
    }
    return all
  } catch (err) {
    console.warn(`[prerender] could not fetch listings:`, err?.message)
    return all
  }
}

/** A listing's Armenian headline, mirroring roleTitle() in src/lib/vacancy.ts. */
function listingTitle(v) {
  const own = (v.titleI18n?.[LOCALE] || v.title || '').trim()
  if (own) return own
  return v.specialty?.roleNameI18n?.[LOCALE] || v.specialty?.roleName || ''
}

/**
 * Which listings belong on a landing page.
 *
 * A deliberately narrow re-implementation of the three filters the curated
 * queries actually use. It decides what goes in a static text block, nothing
 * more — the rendered page fetches through the real API with the real filter
 * codec, so a disagreement here can only ever mean a link is missing from the
 * baked block, never that the page shows the wrong listings.
 */
function matchListings(landing, listings) {
  const params = new URLSearchParams(landing.query)
  const list = (key) => (params.get(key) ?? '').split(',').filter(Boolean)
  const specialties = list('specialty')
  const areas = list('area')
  const payTypes = list('payType')

  return listings.filter((v) => {
    if (specialties.length && !specialties.includes(v.specialty?.key)) return false
    if (payTypes.length && !payTypes.includes(v.payType)) return false
    if (areas.length) {
      const keys = [v.branch?.area?.key, v.branch?.area?.parent?.key].filter(Boolean)
      if (!keys.some((k) => areas.includes(k))) return false
    }
    return true
  })
}

/** CollectionPage + BreadcrumbList for a landing page — the same shape the
 *  route emits at runtime (src/lib/jsonLd.ts collectionJsonLd). */
function landingJsonLd(landing, copy, listings) {
  const url = canonicalOf(routeFor(landing.slug))
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: copy.h1,
    description: copy.description,
    url,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: hy.app.product, item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: copy.h1, item: url },
      ],
    },
    ...(listings.length
      ? {
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: listings.length,
            itemListElement: listings.slice(0, 20).map((v, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `${SITE}/v/${encodeURIComponent(v.id)}`,
              name: listingTitle(v),
            })),
          },
        }
      : {}),
  }
}

/** WebSite + Organization for the board — mirrors siteJsonLd() at runtime. */
function siteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        url: `${SITE}/`,
        name: BRAND,
        description: hy.seo.boardDescription,
        inLanguage: ['hy', 'en', 'ru'],
        publisher: { '@id': `${SITE}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE}/#organization`,
        name: hy.app.name,
        url: 'https://reserva.am',
        logo: 'https://reserva.am/icon-512.png',
        areaServed: { '@type': 'Country', name: 'Armenia' },
      },
    ],
  }
}

/** Links to every landing page — the crawl path, repeated on each page. */
function landingLinks(excludeSlug) {
  return LANDINGS.filter((l) => l.slug !== excludeSlug)
    .map(
      (l) =>
        `<li><a href="${SITE}${routeFor(l.slug)}">${esc(l.copy[LOCALE].h1)}</a></li>`,
    )
    .join('')
}

/** The board's crawlable block: what the page says, plus the way into the
 *  category pages. */
function boardSeoBody(listings) {
  const items = listings
    .slice(0, 40)
    .map(
      (v) =>
        `<li><a href="${SITE}/v/${encodeURIComponent(v.id)}">${esc(listingTitle(v))}</a></li>`,
    )
    .join('')
  return seoBlock(
    `<h1>${esc(hy.hero.title)}</h1><p>${esc(hy.hero.subtitle)}</p>` +
      `<h2>${esc(hy.browse.title)}</h2><ul>${landingLinks()}</ul>` +
      (items ? `<h2>${esc(hy.nav?.board ?? hy.app.product)}</h2><ul>${items}</ul>` : ''),
  )
}

/** A landing page's crawlable block: its own copy, its listings, its siblings. */
function landingSeoBody(landing, copy, listings) {
  const items = listings
    .slice(0, 30)
    .map(
      (v) =>
        `<li><a href="${SITE}/v/${encodeURIComponent(v.id)}">${esc(listingTitle(v))}</a></li>`,
    )
    .join('')
  return seoBlock(
    `<h1>${esc(copy.h1)}</h1><p>${esc(copy.intro)}</p><p>${esc(copy.body)}</p>` +
      (items ? `<ul>${items}</ul>` : '') +
      `<h2>${esc(hy.browse.title)}</h2><ul>${landingLinks(landing.slug)}</ul>`,
  )
}

/**
 * The sitemap for this host.
 *
 * Covers the pages that are STABLE — the board and the sixteen landing pages,
 * whose URLs change only when this file does. Listings live in the API's own
 * sitemap (see robots.txt): they appear and expire between deploys, so a copy
 * frozen at build time would advertise closed positions.
 */
function writeSitemap() {
  const today = new Date().toISOString().slice(0, 10)
  const urls = [
    { loc: `${SITE}/`, changefreq: 'daily', priority: '1.0' },
    // The salon-facing half of the board. Lower priority than a landing page:
    // it converts a much smaller audience, but it is the only page on the site
    // that speaks to them at all.
    { loc: `${SITE}/signup/`, changefreq: 'monthly', priority: '0.7' },
    ...LANDINGS.map((l) => ({
      loc: `${SITE}${routeFor(l.slug)}`,
      changefreq: 'daily',
      priority: '0.9',
    })),
  ]
  const body = urls
    .map(
      (u) =>
        `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod>` +
        `<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
    )
    .join('\n')
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
  writeFileSync(resolve(distDir, 'sitemap.xml'), xml)
  console.log(`[prerender] ✓ sitemap.xml (${urls.length} urls)`)
}

async function main() {
  const render = await loadRender(ssrEntry)
  if (!render) {
    console.warn('[prerender] SSR bundle missing — skipping prerender (SPA shell kept).')
    return
  }

  // Reset the shell first: every injection below ADDS, so a second run over the
  // same dist would leave a page carrying two canonicals and the previous
  // route's structured data. See sanitizeTemplate.
  const template = sanitizeTemplate(readFileSync(resolve(distDir, 'index.html'), 'utf-8'))
  const listings = await fetchListings()
  console.log(`[prerender] ${listings.length} live listing(s) available at build time`)

  // ── The board ──
  try {
    let bodyHtml = ''
    try {
      bodyHtml = render('/')
    } catch (err) {
      console.warn('[prerender] render failed for / — using SPA shell:', err?.message)
    }
    let html = injectHead(template, {
      canonical: `${SITE}/`,
      title: hy.seo.boardTitle,
      description: hy.seo.boardDescription,
      jsonLd: siteJsonLd(),
      // The id the running app uses for this slot (App.tsx). With it, the app
      // finds the baked graph on mount and leaves it alone instead of adding a
      // second identical one.
      jsonLdId: 'site-jsonld',
    })
    html = injectBody(html, bodyHtml)
    html = html.replace('</body>', `${boardSeoBody(listings)}</body>`)
    writePage(distDir, '/', html)
    console.log('[prerender] ✓ / → dist/index.html')
  } catch (err) {
    console.warn('[prerender] skipped /:', err?.message)
  }

  // ── Salon signup ──
  // Prerendered like the rest: it is a page a salon can arrive at from a search
  // ("post a job Armenia"), so it needs a title and a description of its own
  // rather than the board's.
  try {
    let bodyHtml = ''
    try {
      bodyHtml = render('/signup')
    } catch {
      /* SPA shell is fine — the injected block carries the crawlable text */
    }
    let html = injectHead(template, {
      canonical: canonicalOf('/signup/'),
      title: hy.signup.seoTitle,
      description: hy.signup.seoDescription,
    })
    html = injectBody(html, bodyHtml)
    html = html.replace(
      '</body>',
      `${seoBlock(
        `<h1>${esc(hy.signup.salonTitle)}</h1><p>${esc(hy.signup.seoDescription)}</p>` +
          `<h2>${esc(hy.browse.title)}</h2><ul>${landingLinks()}</ul>`,
      )}</body>`,
    )
    writePage(distDir, '/signup/', html)
    console.log('[prerender] ✓ /signup/ → dist/signup/index.html')
  } catch (err) {
    console.warn('[prerender] skipped /signup/:', err?.message)
  }

  // ── Keyword landing pages ──
  // Written whether or not they currently have listings: they target generic
  // Armenian searches and carry copy of their own, so an empty week must not
  // cost the ranking they have built.
  let ok = 0
  for (const landing of LANDINGS) {
    const route = routeFor(landing.slug)
    try {
      const copy = landing.copy[LOCALE]
      const matched = matchListings(landing, listings)
      let bodyHtml = ''
      try {
        bodyHtml = render(route)
      } catch {
        /* SPA shell is fine — the injected block carries the crawlable text */
      }
      let html = injectHead(template, {
        canonical: canonicalOf(route),
        title: `${copy.title} | ${hy.app.name}`,
        description: copy.description,
        jsonLd: landingJsonLd(landing, copy, matched),
        // useSeo's per-route slot: on mount it REPLACES this block with the
        // same collection rebuilt from live data, rather than appending a
        // second one alongside a snapshot taken at build time.
        jsonLdId: 'route-jsonld',
      })
      html = injectBody(html, bodyHtml)
      html = html.replace('</body>', `${landingSeoBody(landing, copy, matched)}</body>`)
      writePage(distDir, route, html)
      ok++
    } catch (err) {
      console.warn(`[prerender] skipped ${route}:`, err?.message)
    }
  }
  console.log(`[prerender] ✓ ${ok}/${LANDINGS.length} landing page(s) → dist/jobs/<slug>/index.html`)

  writeSitemap()
}

main().catch((err) => {
  // Never fail the build over prerendering — the SPA shell is always valid.
  console.warn('[prerender] non-fatal error:', err?.message)
})
