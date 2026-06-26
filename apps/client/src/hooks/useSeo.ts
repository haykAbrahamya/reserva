import { useEffect } from 'react'
import { useI18n, LOCALE_META } from '@/i18n'

const SITE = 'https://reserva.am'

interface SeoOptions {
  /** Final document title. Should already include the brand where wanted. */
  title: string
  /** Meta description (~150–160 chars ideal). */
  description: string
  /** Canonical path, e.g. "/salons". Defaults to the current pathname. */
  path?: string
  /** Absolute OG image URL. Defaults to the site share image. */
  image?: string
  /** Lets a noindex be set for thin/private routes. */
  noindex?: boolean
  /** Optional schema.org JSON-LD object injected as a managed <script> tag. */
  jsonLd?: Record<string, unknown>
}

/** Upsert a <meta> by name or property, creating it if missing. */
function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** Upsert <link rel="canonical">. */
function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Per-route SEO. A pure SPA serves one HTML shell, so without this every page
 * would share the same title/description — invisible to search. This hook
 * rewrites the document head for the active route + locale on mount and whenever
 * the locale changes, keeping the static index.html as the crawl-time baseline.
 */
export function useSeo({ title, description, path, image, noindex, jsonLd }: SeoOptions) {
  const { locale } = useI18n()

  useEffect(() => {
    if (typeof document === 'undefined') return

    const url = `${SITE}${path ?? window.location.pathname}`
    const img = image ?? `${SITE}/og-image.png`
    const ogLocale = LOCALE_META[locale].lang.replace('-', '_')

    document.title = title
    setMeta('name', 'description', description)
    setMeta('name', 'robots', noindex
      ? 'noindex, follow'
      : 'index, follow, max-image-preview:large, max-snippet:-1')
    setCanonical(url)

    // Open Graph
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:image', img)
    setMeta('property', 'og:locale', ogLocale)

    // Twitter
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', img)

    // Page-scoped JSON-LD (e.g. LocalBusiness for a salon). Tagged with a known
    // id so we replace — never stack — it across route changes, and remove it
    // on unmount so a page without structured data doesn't inherit the last one.
    const LD_ID = 'reserva-page-jsonld'
    document.getElementById(LD_ID)?.remove()
    if (jsonLd) {
      const el = document.createElement('script')
      el.type = 'application/ld+json'
      el.id = LD_ID
      el.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(el)
    }
    return () => { document.getElementById(LD_ID)?.remove() }
  }, [title, description, path, image, noindex, jsonLd, locale])
}
