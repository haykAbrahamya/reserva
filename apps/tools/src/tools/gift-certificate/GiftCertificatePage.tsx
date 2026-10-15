import { useCallback, useMemo } from 'react'
import { useI18n, useT } from '@/i18n'
import { BookingPitch } from '@/components/tools/BookingPitch/BookingPitch'
import { BrandFields } from '@/components/tools/BrandFields/BrandFields'
import { CanvasPreview } from '@/components/tools/CanvasPreview/CanvasPreview'
import { ExportActions } from '@/components/tools/ExportActions/ExportActions'
import { PdfButton } from '@/components/tools/PdfButton/PdfButton'
import { ThemePicker } from '@/components/tools/ThemePicker/ThemePicker'
import { ToolSection } from '@/components/tools/ToolSection/ToolSection'
import { ToolLayout } from '@/layouts/ToolLayout/ToolLayout'
import { ToolWorkspace } from '@/layouts/ToolWorkspace/ToolWorkspace'
import { loadFonts } from '@/lib/canvas/fonts'
import { useCanvasFile } from '@/lib/canvas/useCanvasFile'
import { formatFullDate, useCalendarWords } from '@/lib/dates'
import { fileNameFor } from '@/lib/fileName'
import { instagramHandle } from '@/lib/instagram'
import { themeById } from '@/lib/story/themes'
import { toolById } from '@/tools/registry'
import { GiftFields } from './components/GiftFields/GiftFields'
import { TermsFields } from './components/TermsFields/TermsFields'
import { GIFT_FONTS, drawGift } from './drawGift'
import { GIFT_CARD, draftText, type GiftLabels } from './model'
import { useGiftDraft } from './useGiftDraft'

const tool = toolById('giftCertificate')

/** Gift certificate: a card to send as an image or print from a PDF. */
export function GiftCertificatePage() {
  const t = useT()
  const { locale } = useI18n()
  const { draft, setBrand, setTheme, setField, renewCode } = useGiftDraft(locale)

  const words = useCalendarWords()
  const theme = themeById(draft.themeId)
  const labels = useMemo<GiftLabels>(
    () => ({
      for: t('giftCertificate.card.for'),
      from: t('giftCertificate.card.from'),
      validity: draft.validUntil
        ? t('giftCertificate.card.validUntil', { date: formatFullDate(draft.validUntil, words) })
        : '',
    }),
    [t, draft.validUntil, words],
  )
  const text = useMemo(() => draftText(draft, labels), [draft, labels])

  const draw = useCallback((ctx: CanvasRenderingContext2D) => drawGift(ctx, draft, theme, labels), [draft, theme, labels])
  const prepare = useCallback(() => loadFonts(GIFT_FONTS, text), [text])

  const { getFile, ready } = useCanvasFile({
    width: GIFT_CARD.width,
    height: GIFT_CARD.height,
    draw,
    prepare,
    fileName: fileNameFor('gift-certificate', draft.title),
  })

  // The image and the PDF are the same card, reported the same way.
  const exportDetails = { theme: draft.themeId, ig: instagramHandle(draft.contact) }

  return (
    <ToolLayout tool={tool}>
      <ToolWorkspace
        previewAspect={GIFT_CARD.width / GIFT_CARD.height}
        editor={
          <>
            <ToolSection title={t('editor.style')}>
              <ThemePicker value={draft.themeId} onChange={setTheme} label={t('editor.style')} />
            </ToolSection>
            <ToolSection title={t('giftCertificate.sections.gift')}>
              <GiftFields draft={draft} onChange={setField} />
            </ToolSection>
            <ToolSection title={t('giftCertificate.sections.terms')}>
              <TermsFields draft={draft} onChange={setField} onRenewCode={renewCode} />
            </ToolSection>
            <ToolSection title={t('editor.details')}>
              <BrandFields
                value={draft}
                onChange={setBrand}
                headingPlaceholder={t('giftCertificate.headingPlaceholder')}
              />
            </ToolSection>
          </>
        }
        preview={
          <>
            <CanvasPreview
              width={GIFT_CARD.width}
              height={GIFT_CARD.height}
              draw={draw}
              prepare={prepare}
              label={t('giftCertificate.preview')}
            />
            <ExportActions
              getFile={getFile}
              ready={ready}
              shareTitle={draft.heading.trim() || t('tools.giftCertificate.title')}
              format={t('giftCertificate.format')}
              details={exportDetails}
            >
              <PdfButton
                width={GIFT_CARD.width}
                height={GIFT_CARD.height}
                widthMm={GIFT_CARD.widthMm}
                heightMm={GIFT_CARD.heightMm}
                draw={draw}
                prepare={prepare}
                fileName={fileNameFor('gift-certificate', draft.title, 'pdf')}
                details={exportDetails}
              />
            </ExportActions>
          </>
        }
        footer={
          <BookingPitch
            title={t('giftCertificate.pitch.title')}
            body={t('giftCertificate.pitch.body')}
            source="gift-certificate"
          />
        }
      />
    </ToolLayout>
  )
}
