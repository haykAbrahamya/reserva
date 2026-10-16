import { useCallback, useMemo } from 'react'
import { Input } from '@reserva/ui'
import { useI18n, useT } from '@/i18n'
import { BookingPitch } from '@/components/tools/BookingPitch/BookingPitch'
import { CanvasPreview } from '@/components/tools/CanvasPreview/CanvasPreview'
import { ExportActions } from '@/components/tools/ExportActions/ExportActions'
import { FieldGrid, FieldWide } from '@/components/tools/FieldGrid/FieldGrid'
import { LayoutPicker } from '@/components/tools/LayoutPicker/LayoutPicker'
import { PdfButton } from '@/components/tools/PdfButton/PdfButton'
import { ThemePicker } from '@/components/tools/ThemePicker/ThemePicker'
import { ToolSection } from '@/components/tools/ToolSection/ToolSection'
import { ToolLayout } from '@/layouts/ToolLayout/ToolLayout'
import { ToolWorkspace } from '@/layouts/ToolWorkspace/ToolWorkspace'
import { loadFonts } from '@/lib/canvas/fonts'
import { useCanvasFile } from '@/lib/canvas/useCanvasFile'
import { fileNameFor } from '@/lib/fileName'
import { instagramHandle } from '@/lib/instagram'
import { themeById } from '@/lib/story/themes'
import { toolById } from '@/tools/registry'
import { ContactFields } from './components/ContactFields/ContactFields'
import { QrPicker } from './components/QrPicker/QrPicker'
import { CARD_FONTS, cardContent, drawFace, drawPrintPage, drawSheet } from './draw'
import { CARD, CARD_LAYOUTS, LIMITS, PRINT, SHEET, draftText, type CardLabels, type CardLayout } from './model'
import { useCardDraft } from './useCardDraft'

const tool = toolById('businessCard')

/** Thumbnails of a card face: a 1800-wide face at 0.15 is 270 px — sharp at the width they show. */
const THUMB_SCALE = 0.15

/**
 * Business card: a name, a profession and the ways to get in touch, as a
 * card to send (both sides on one picture) or to print (a front-and-back PDF
 * with bleed, at the size print shops cut).
 *
 * The page only wires the pieces together: one set of faces is drawn into the
 * preview, the thumbnails, the picture and the PDF alike.
 */
export function BusinessCardPage() {
  const t = useT()
  const { locale } = useI18n()
  const { draft, setField, setTheme, setLayout, toggleMessenger, setQr } = useCardDraft(locale)

  const theme = themeById(draft.themeId)
  const labels = useMemo<CardLabels>(
    () => ({
      phone: t('businessCard.card.phone'),
      address: t('businessCard.card.address'),
      website: t('businessCard.card.website'),
    }),
    [t],
  )
  const content = useMemo(() => cardContent(draft, labels), [draft, labels])
  const text = useMemo(() => draftText(draft, labels), [draft, labels])
  const prepare = useCallback(() => loadFonts(CARD_FONTS, text), [text])

  const draw = useCallback((ctx: CanvasRenderingContext2D) => drawSheet(ctx, content, theme), [content, theme])
  const drawLayout = useCallback(
    (ctx: CanvasRenderingContext2D, layout: CardLayout) => drawFace(ctx, 'front', { ...content, draft: { ...draft, layout } }, theme),
    [content, draft, theme],
  )
  const printPages = useMemo(
    () => [
      (ctx: CanvasRenderingContext2D) => drawPrintPage(ctx, 'front', content, theme),
      (ctx: CanvasRenderingContext2D) => drawPrintPage(ctx, 'back', content, theme),
    ],
    [content, theme],
  )

  const { getFile, ready } = useCanvasFile({
    width: SHEET.width,
    height: SHEET.height,
    draw,
    prepare,
    fileName: fileNameFor('business-card', draft.name),
  })

  // Signed with the Instagram as typed — the line the other tools are signed
  // with, so one visitor's results meet in one lead — or else the phone.
  const exportDetails = {
    theme: draft.themeId,
    fmt: draft.layout,
    ig: instagramHandle(draft.instagram),
    contact: (draft.instagram.trim() || draft.phone.trim()) || undefined,
  }

  return (
    <ToolLayout tool={tool}>
      <ToolWorkspace
        previewAspect={SHEET.width / SHEET.height}
        editor={
          <>
            <ToolSection title={t('businessCard.sections.design')}>
              <LayoutPicker
                value={draft.layout}
                options={CARD_LAYOUTS.map((layout) => ({ value: layout, label: t(`businessCard.layouts.${layout}`) }))}
                onChange={setLayout}
                width={CARD.width}
                height={CARD.height}
                scale={THUMB_SCALE}
                draw={drawLayout}
                prepare={prepare}
                label={t('businessCard.sections.design')}
              />
            </ToolSection>
            <ToolSection title={t('editor.style')}>
              <ThemePicker value={draft.themeId} onChange={setTheme} label={t('editor.style')} />
            </ToolSection>
            <ToolSection title={t('businessCard.sections.you')}>
              <FieldGrid>
                <FieldWide>
                  <Input
                    label={t('businessCard.fields.name')}
                    value={draft.name}
                    maxLength={LIMITS.name}
                    placeholder={t('businessCard.fields.namePlaceholder')}
                    autoComplete="name"
                    onChange={(e) => setField('name', e.target.value)}
                  />
                </FieldWide>
                <FieldWide>
                  <Input
                    label={t('businessCard.fields.role')}
                    value={draft.role}
                    maxLength={LIMITS.role}
                    placeholder={t('businessCard.fields.rolePlaceholder')}
                    autoComplete="organization-title"
                    onChange={(e) => setField('role', e.target.value)}
                  />
                </FieldWide>
              </FieldGrid>
            </ToolSection>
            <ToolSection title={t('businessCard.sections.contacts')}>
              <ContactFields draft={draft} onChange={setField} onMessenger={toggleMessenger} />
            </ToolSection>
            <ToolSection title={t('businessCard.sections.qr')}>
              <QrPicker draft={draft} onChange={setQr} />
            </ToolSection>
          </>
        }
        preview={
          <>
            <CanvasPreview
              width={SHEET.width}
              height={SHEET.height}
              draw={draw}
              prepare={prepare}
              label={t('businessCard.preview')}
            />
            <ExportActions
              getFile={getFile}
              ready={ready}
              shareTitle={draft.name.trim() || t('tools.businessCard.title')}
              format={t('businessCard.format')}
              details={exportDetails}
            >
              <PdfButton
                width={PRINT.width}
                height={PRINT.height}
                widthMm={PRINT.widthMm}
                heightMm={PRINT.heightMm}
                draw={printPages}
                prepare={prepare}
                fileName={fileNameFor('business-card', draft.name, 'pdf')}
                details={exportDetails}
              />
            </ExportActions>
          </>
        }
        footer={
          <BookingPitch
            title={t('businessCard.pitch.title')}
            body={t('businessCard.pitch.body')}
            source="business-card"
          />
        }
      />
    </ToolLayout>
  )
}
