import { drawBackground } from '@/lib/story/draw'
import { STORY } from '@/lib/story/size'
import type { StoryTheme } from '@/lib/story/themes'
import { isFilled, promoPrice, type PromoDraft, type PromoLabels, type PromoLayout } from '../model'
import { drawClassic } from './classic'
import { drawCoupon } from './coupon'
import type { PromoContent } from './kit'
import { drawPoster } from './poster'
import { drawSticker } from './sticker'

export { PROMO_FONTS } from './kit'

// ─────────────────────────────────────────────────────────────
// The promo story. The same background as every story tool, then one of the
// layouts — each composes the same content its own way (see their files).
// ─────────────────────────────────────────────────────────────

const LAYOUTS: Record<PromoLayout, (ctx: CanvasRenderingContext2D, content: PromoContent, theme: StoryTheme) => void> = {
  classic: drawClassic,
  sticker: drawSticker,
  coupon: drawCoupon,
  poster: drawPoster,
}

export function drawPromo(ctx: CanvasRenderingContext2D, draft: PromoDraft, theme: StoryTheme, labels: PromoLabels) {
  ctx.save()
  ctx.clearRect(0, 0, STORY.width, STORY.height)
  ctx.textBaseline = 'alphabetic'

  drawBackground(ctx, theme, STORY.width, STORY.height)
  const rows = draft.items
    .filter(isFilled)
    .map((item) => ({ name: item.name, price: promoPrice(item, draft.discount) }))
  LAYOUTS[draft.layout](ctx, { draft, rows, labels }, theme)

  ctx.restore()
}
