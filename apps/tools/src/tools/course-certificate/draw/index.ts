import { initialsOf } from '@/lib/canvas/monogram'
import type { StoryTheme } from '@/lib/story/themes'
import { designSize, type CertLabels, type CertLayout, type CertificateDraft } from '../model'
import { aura } from './aura'
import { band } from './band'
import { classic } from './classic'
import type { CertContent, Design } from './kit'
import { luxe } from './luxe'
import { medallion } from './medallion'
import { minimal } from './minimal'

export { CERT_FONTS } from './kit'
export type { CertContent }

// ─────────────────────────────────────────────────────────────
// The course certificate: one drawing in design units (2000 wide), shown in
// the preview, saved as the image, and scaled to 300 dpi for the PDF.
// ─────────────────────────────────────────────────────────────

const DESIGNS: Record<CertLayout, Design> = { classic, minimal, band, luxe, aura, medallion }

export function certContent(draft: CertificateDraft, labels: CertLabels, logo: HTMLImageElement | null): CertContent {
  return { draft, labels, logo, initials: initialsOf(draft.school), ...designSize(draft.size) }
}

/** The certificate at its design size. */
export function drawCertificate(ctx: CanvasRenderingContext2D, content: CertContent, theme: StoryTheme) {
  ctx.save()
  ctx.textBaseline = 'alphabetic'
  DESIGNS[content.draft.layout](ctx, content, theme)
  ctx.restore()
}

/** The certificate scaled up to fill a canvas `width` wide — a print page at 300 dpi. */
export function drawCertificateAt(ctx: CanvasRenderingContext2D, width: number, content: CertContent, theme: StoryTheme) {
  ctx.save()
  ctx.scale(width / content.width, width / content.width)
  drawCertificate(ctx, content, theme)
  ctx.restore()
}
