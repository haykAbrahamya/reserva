import { useCallback, useMemo } from 'react'
import { useI18n, useT } from '@/i18n'
import { BookingPitch } from '@/components/tools/BookingPitch/BookingPitch'
import { BrandFields } from '@/components/tools/BrandFields/BrandFields'
import { CanvasPreview } from '@/components/tools/CanvasPreview/CanvasPreview'
import { ExportActions } from '@/components/tools/ExportActions/ExportActions'
import { ThemePicker } from '@/components/tools/ThemePicker/ThemePicker'
import { ToolSection } from '@/components/tools/ToolSection/ToolSection'
import { ToolLayout } from '@/layouts/ToolLayout/ToolLayout'
import { ToolWorkspace } from '@/layouts/ToolWorkspace/ToolWorkspace'
import { loadFonts } from '@/lib/canvas/fonts'
import { useCanvasFile } from '@/lib/canvas/useCanvasFile'
import { fileNameFor } from '@/lib/fileName'
import { instagramHandle } from '@/lib/instagram'
import { STORY } from '@/lib/story/size'
import { themeById } from '@/lib/story/themes'
import { toolById } from '@/tools/registry'
import { ServiceList } from './components/ServiceList/ServiceList'
import { PRICE_LIST_FONTS, drawPriceList } from './drawPriceList'
import { draftText, isFilled } from './model'
import { usePriceListDraft } from './usePriceListDraft'

const tool = toolById('priceList')

/**
 * Price list maker: services and prices in, an Instagram story out.
 *
 * This page only wires the pieces together — the draft (state + persistence),
 * the form, and one draw function shared by the live preview and the export.
 */
export function PriceListPage() {
  const t = useT()
  const { locale } = useI18n()
  const { draft, setBrand, setTheme, updateItem, addItem, removeItem, clearItems } = usePriceListDraft(locale)

  const theme = themeById(draft.themeId)
  const text = useMemo(() => draftText(draft), [draft])

  const draw = useCallback((ctx: CanvasRenderingContext2D) => drawPriceList(ctx, draft, theme), [draft, theme])
  const prepare = useCallback(() => loadFonts(PRICE_LIST_FONTS, text), [text])

  const { getFile, ready } = useCanvasFile({
    width: STORY.width,
    height: STORY.height,
    draw,
    prepare,
    fileName: fileNameFor('price-list', draft.title),
  })

  return (
    <ToolLayout tool={tool}>
      <ToolWorkspace
        editor={
          <>
            <ToolSection title={t('editor.style')}>
              <ThemePicker value={draft.themeId} onChange={setTheme} label={t('editor.style')} />
            </ToolSection>
            <ToolSection title={t('editor.details')}>
              <BrandFields
                value={draft}
                onChange={setBrand}
                headingPlaceholder={t('priceList.headingPlaceholder')}
              />
            </ToolSection>
            <ServiceList
              items={draft.items}
              onUpdate={updateItem}
              onAdd={addItem}
              onRemove={removeItem}
              onClear={clearItems}
            />
          </>
        }
        preview={
          <>
            <CanvasPreview
              width={STORY.width}
              height={STORY.height}
              draw={draw}
              prepare={prepare}
              label={t('priceList.preview')}
            />
            <ExportActions
              getFile={getFile}
              ready={ready}
              shareTitle={draft.title.trim() || t('tools.priceList.title')}
              format={t('priceList.format')}
              details={{
                theme: draft.themeId,
                n: draft.items.filter(isFilled).length,
                ig: instagramHandle(draft.contact),
                contact: draft.contact || undefined,
              }}
            />
          </>
        }
        footer={
          <BookingPitch
            title={t('priceList.pitch.title')}
            body={t('priceList.pitch.body')}
            source="price-list"
          />
        }
      />
    </ToolLayout>
  )
}
