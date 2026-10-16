import { useCallback, useMemo } from 'react'
import { Input } from '@reserva/ui'
import { useI18n, useT } from '@/i18n'
import { BookingPitch } from '@/components/tools/BookingPitch/BookingPitch'
import { BrandFields } from '@/components/tools/BrandFields/BrandFields'
import { CanvasPreview } from '@/components/tools/CanvasPreview/CanvasPreview'
import { ExportActions } from '@/components/tools/ExportActions/ExportActions'
import { LayoutPicker } from '@/components/tools/LayoutPicker/LayoutPicker'
import { ThemePicker } from '@/components/tools/ThemePicker/ThemePicker'
import { ToolSection } from '@/components/tools/ToolSection/ToolSection'
import { ToolLayout } from '@/layouts/ToolLayout/ToolLayout'
import { ToolWorkspace } from '@/layouts/ToolWorkspace/ToolWorkspace'
import { loadFonts } from '@/lib/canvas/fonts'
import { useCanvasFile } from '@/lib/canvas/useCanvasFile'
import { parseDay, useCalendarWords } from '@/lib/dates'
import { fileNameFor } from '@/lib/fileName'
import { instagramHandle } from '@/lib/instagram'
import { STORY } from '@/lib/story/size'
import { themeById } from '@/lib/story/themes'
import { toolById } from '@/tools/registry'
import { OfferFields } from './components/OfferFields/OfferFields'
import { PromoServices } from './components/PromoServices/PromoServices'
import { PROMO_FONTS, drawPromo } from './draw'
import { LIMITS, PROMO_LAYOUTS, draftText, isFilled, type PromoLabels, type PromoLayout } from './model'
import { usePromoDraft } from './usePromoDraft'
import s from './PromoPage.module.scss'

const tool = toolById('promo')

/**
 * Promo: a discount announced as an Instagram story — the percent off, the
 * services at their old and new prices, until when — in four layouts.
 *
 * The page only wires the pieces together: the draft, the form, and one draw
 * function shared by the live preview, the layout thumbnails and the export.
 */
export function PromoPage() {
  const t = useT()
  const { locale } = useI18n()
  const { draft, setBrand, setTheme, setLayout, setDiscount, setField, updateItem, addItem, removeItem, clearItems } =
    usePromoDraft(locale)

  const words = useCalendarWords()
  const theme = themeById(draft.themeId)
  const labels = useMemo<PromoLabels>(() => {
    const until = draft.until ? parseDay(draft.until) : null
    return {
      until: until ? t('promo.card.until', { day: until.getDate(), month: words.monthsOf[until.getMonth()] }) : '',
      off: t('promo.card.off'),
    }
  }, [t, draft.until, words])
  const text = useMemo(() => draftText(draft, labels), [draft, labels])

  const draw = useCallback((ctx: CanvasRenderingContext2D) => drawPromo(ctx, draft, theme, labels), [draft, theme, labels])
  const drawLayout = useCallback(
    (ctx: CanvasRenderingContext2D, layout: PromoLayout) => drawPromo(ctx, { ...draft, layout }, theme, labels),
    [draft, theme, labels],
  )
  const prepare = useCallback(() => loadFonts(PROMO_FONTS, text), [text])

  const { getFile, ready } = useCanvasFile({
    width: STORY.width,
    height: STORY.height,
    draw,
    prepare,
    fileName: fileNameFor('promo', draft.title),
  })

  return (
    <ToolLayout tool={tool}>
      <ToolWorkspace
        editor={
          <>
            <ToolSection title={t('promo.sections.design')}>
              <LayoutPicker
                value={draft.layout}
                options={PROMO_LAYOUTS.map((layout) => ({ value: layout, label: t(`promo.layouts.${layout}`) }))}
                onChange={setLayout}
                width={STORY.width}
                height={STORY.height}
                scale={0.25}
                draw={drawLayout}
                prepare={prepare}
                label={t('promo.sections.design')}
              />
            </ToolSection>
            <ToolSection title={t('editor.style')}>
              <ThemePicker value={draft.themeId} onChange={setTheme} label={t('editor.style')} />
            </ToolSection>
            <ToolSection title={t('promo.sections.offer')}>
              <OfferFields draft={draft} onDiscount={setDiscount} onChange={setField} />
            </ToolSection>
            <PromoServices
              items={draft.items}
              discount={draft.discount}
              onUpdate={updateItem}
              onAdd={addItem}
              onRemove={removeItem}
              onClear={clearItems}
            />
            <ToolSection title={t('editor.details')}>
              <BrandFields value={draft} onChange={setBrand} headingPlaceholder={t('promo.headingPlaceholder')} />
              <div className={s.note}>
                <Input
                  label={t('promo.fields.note')}
                  value={draft.note}
                  maxLength={LIMITS.note}
                  placeholder={t('promo.fields.notePlaceholder')}
                  onChange={(e) => setField('note', e.target.value)}
                />
              </div>
            </ToolSection>
          </>
        }
        preview={
          <>
            <CanvasPreview
              width={STORY.width}
              height={STORY.height}
              draw={draw}
              prepare={prepare}
              label={t('promo.preview')}
            />
            <ExportActions
              getFile={getFile}
              ready={ready}
              shareTitle={draft.title.trim() || t('tools.promo.title')}
              format={t('promo.format')}
              details={{
                theme: draft.themeId,
                fmt: draft.layout,
                n: draft.items.filter(isFilled).length,
                ig: instagramHandle(draft.contact),
                contact: draft.contact || undefined,
              }}
            />
          </>
        }
        footer={<BookingPitch title={t('promo.pitch.title')} body={t('promo.pitch.body')} source="promo" />}
      />
    </ToolLayout>
  )
}
