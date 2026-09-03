import { useEffect } from 'react'

// ─────────────────────────────────────────────────────────────
// Per-route document head.
//
// This is a client-rendered SPA serving one HTML shell for every route, so
// nothing route-specific can live in index.html: a static canonical there would
// make every crawled listing declare the board as its canonical, and a job
// board with one indexed page is a job board nobody finds.
//
// So title, description, canonical and structured data are all set at runtime,
// per route. Each URL self-canonicalizes at crawl time.
// ─────────────────────────────────────────────────────────────

const JSONLD_ID = 'route-jsonld'

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

export interface SeoInput {
  title: string
  description?: string
  /** Canonical path including the query string when it is meaningful. */
  canonicalPath?: string
  /** Structured data for this route (a JobPosting on a listing page). */
  jsonLd?: Record<string, unknown> | null
  /** Keep a page out of the index — a filtered board, an error page. */
  noIndex?: boolean
}

export function useSeo({ title, description, canonicalPath, jsonLd, noIndex }: SeoInput) {
  useEffect(() => {
    document.title = title
    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description)
    }

    setMeta('meta[property="og:title"]', 'property', 'og:title', title)
    if (description) {
      setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    }

    const url = `${window.location.origin}${canonicalPath ?? window.location.pathname}`
    setLink('canonical', url)
    setMeta('meta[property="og:url"]', 'property', 'og:url', url)

    /*
     * A filtered board is deliberately not indexed. Every filter combination is
     * a distinct URL over near-identical content, which is textbook duplicate
     * content — and it would spend the crawl budget that the listing pages
     * actually need.
     */
    setMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      noIndex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1',
    )
  }, [title, description, canonicalPath, noIndex])

  // Kept in its own effect so a page whose data arrives late refreshes only the
  // structured data, without rewriting every tag above.
  useEffect(() => {
    const existing = document.getElementById(JSONLD_ID)
    if (existing) existing.remove()
    if (!jsonLd) return

    const script = document.createElement('script')
    script.id = JSONLD_ID
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(jsonLd)
    document.head.appendChild(script)

    return () => script.remove()
  }, [jsonLd])
}
