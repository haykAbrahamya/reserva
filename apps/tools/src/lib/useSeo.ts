import { useEffect } from 'react'

// ─────────────────────────────────────────────────────────────
// Per-route <head> management.
//
// index.html is one shell served for every route, so canonical, hreflang and
// og:url are set here at runtime, never statically — a static canonical would
// make every tool page declare the home page as its canonical.
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

/**
 * The language lives in the visitor's storage, not the URL, so every locale is
 * the same address. Declaring that keeps a crawler from treating the three
 * languages as duplicate pages competing with each other.
 */
const HREFLANGS = ['hy', 'en', 'ru', 'x-default']

function setHreflang(href: string) {
  document.head
    .querySelectorAll('link[rel="alternate"][data-seo-hreflang]')
    .forEach((el) => el.remove())
  for (const lang of HREFLANGS) {
    const el = document.createElement('link')
    el.setAttribute('rel', 'alternate')
    el.setAttribute('hreflang', lang)
    el.setAttribute('href', href)
    el.setAttribute('data-seo-hreflang', '')
    document.head.appendChild(el)
  }
}

export interface SeoInput {
  title: string
  description?: string
  /** Path to declare as canonical. Defaults to the current path. */
  canonicalPath?: string
  /** Structured data for this route (a WebApplication on a tool page). */
  jsonLd?: Record<string, unknown> | null
  /** Keep a page out of the index — an error page. */
  noIndex?: boolean
}

/** Shared platform artwork until each tool gets its own preview image. */
const OG_IMAGE = 'https://reserva.am/og-image.png'

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
    setHreflang(url)
    setMeta('meta[property="og:url"]', 'property', 'og:url', url)
    setMeta('meta[property="og:image"]', 'property', 'og:image', OG_IMAGE)
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', OG_IMAGE)

    setMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      noIndex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1',
    )
  }, [title, description, canonicalPath, noIndex])

  useEffect(() => {
    document.getElementById(JSONLD_ID)?.remove()
    if (!jsonLd) return

    const script = document.createElement('script')
    script.id = JSONLD_ID
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(jsonLd)
    document.head.appendChild(script)

    return () => script.remove()
  }, [jsonLd])
}
