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
import { formatFullDate, useCalendarWords } from '@/lib/dates'
import { fileNameFor } from '@/lib/fileName'
import { instagramHandle } from '@/lib/instagram'
import { themeById } from '@/lib/story/themes'
import { toolById } from '@/tools/registry'
import { CertificateFields } from './components/CertificateFields/CertificateFields'
import { LogoField } from './components/LogoField/LogoField'
import { SignatureFields } from './components/SignatureFields/SignatureFields'
import { SizeSwitch } from './components/SizeSwitch/SizeSwitch'
import { CERT_FONTS, certContent, drawCertificate, drawCertificateAt } from './draw'
import { CERT_LAYOUTS, LIMITS, PAPER, designSize, draftText, printSize, type CertLabels, type CertLayout } from './model'
import { useCertificateDraft } from './useCertificateDraft'
import { useLogo } from './useLogo'
import s from './CertificatePage.module.scss'

const tool = toolById('courseCertificate')

/** Thumbnails: the 2000-wide design at 0.12 is 240 px — sharp at the width they show. */
const THUMB_SCALE = 0.12

/**
 * Course certificate: for a school or a master who teaches — the student's
 * name, the course, the school's logo and two signatures with a place for a
 * stamp — printed on A4 or A5, or sent as an image.
 *
 * One drawing serves the preview, the thumbnails, the image and the PDF.
 */
export function CertificatePage() {
  const t = useT()
  const { locale } = useI18n()
  const { draft, setField, setTheme, setLayout, setSize, setSigner, setSeal, bumpNumber } = useCertificateDraft(locale)
  const logo = useLogo()

  const words = useCalendarWords()
  const theme = themeById(draft.themeId)
  const labels = useMemo<CertLabels>(
    () => ({
      issued: [draft.city.trim(), draft.date ? formatFullDate(draft.date, words) : ''].filter(Boolean).join(', '),
      seal: t('courseCertificate.seal'),
    }),
    [draft.city, draft.date, words, t],
  )
  const content = useMemo(() => certContent(draft, labels, logo.image), [draft, labels, logo.image])
  const text = useMemo(() => draftText(draft, labels), [draft, labels])
  const prepare = useCallback(() => loadFonts(CERT_FONTS, text), [text])

  const size = designSize(draft.size)
  const print = printSize(draft.size)
  const draw = useCallback((ctx: CanvasRenderingContext2D) => drawCertificate(ctx, content, theme), [content, theme])
  const drawLayout = useCallback(
    (ctx: CanvasRenderingContext2D, layout: CertLayout) => drawCertificate(ctx, { ...content, draft: { ...draft, layout } }, theme),
    [content, draft, theme],
  )
  const drawPrint = useCallback(
    (ctx: CanvasRenderingContext2D) => drawCertificateAt(ctx, print.width, content, theme),
    [print.width, content, theme],
  )

  const fileName = fileNameFor('certificate', draft.recipient)
  const { getFile, ready } = useCanvasFile({ width: size.width, height: size.height, draw, prepare, fileName })

  const paper = t(`courseCertificate.size.${draft.size}`)
  const exportDetails = {
    theme: draft.themeId,
    fmt: `${draft.layout}-${draft.size}`,
    ig: instagramHandle(draft.link),
    contact: draft.link.trim() || undefined,
  }

  return (
    <ToolLayout tool={tool}>
      <ToolWorkspace
        previewAspect={size.width / size.height}
        editor={
          <>
            <ToolSection title={t('courseCertificate.sections.design')}>
              <div className={s.design}>
                <LayoutPicker
                  value={draft.layout}
                  options={CERT_LAYOUTS.map((layout) => ({ value: layout, label: t(`courseCertificate.layouts.${layout}`) }))}
                  onChange={setLayout}
                  width={size.width}
                  height={size.height}
                  scale={THUMB_SCALE}
                  draw={drawLayout}
                  prepare={prepare}
                  label={t('courseCertificate.sections.design')}
                />
                <div className={s.size}>
                  <span className={s.sizeLabel}>{t('courseCertificate.size.label')}</span>
                  <SizeSwitch value={draft.size} onChange={setSize} />
                </div>
              </div>
            </ToolSection>
            <ToolSection title={t('editor.style')}>
              <ThemePicker value={draft.themeId} onChange={setTheme} label={t('editor.style')} />
            </ToolSection>
            <ToolSection title={t('courseCertificate.sections.certificate')}>
              <CertificateFields draft={draft} onChange={setField} onNextNumber={bumpNumber} />
            </ToolSection>
            <ToolSection title={t('courseCertificate.sections.school')}>
              <FieldGrid>
                <FieldWide>
                  <Input
                    label={t('courseCertificate.fields.school')}
                    value={draft.school}
                    maxLength={LIMITS.school}
                    placeholder={t('courseCertificate.fields.schoolPlaceholder')}
                    autoComplete="organization"
                    onChange={(e) => setField('school', e.target.value)}
                  />
                </FieldWide>
                <FieldWide>
                  <LogoField url={logo.url} onPick={logo.pick} onRemove={logo.remove} />
                </FieldWide>
                <FieldWide>
                  <Input
                    label={t('courseCertificate.fields.link')}
                    value={draft.link}
                    maxLength={LIMITS.link}
                    placeholder={t('courseCertificate.fields.linkPlaceholder')}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(e) => setField('link', e.target.value)}
                  />
                </FieldWide>
              </FieldGrid>
            </ToolSection>
            <ToolSection title={t('courseCertificate.sections.signatures')}>
              <SignatureFields draft={draft} onSigner={setSigner} onSeal={setSeal} />
            </ToolSection>
          </>
        }
        preview={
          <>
            <CanvasPreview
              width={size.width}
              height={size.height}
              draw={draw}
              prepare={prepare}
              label={t('courseCertificate.preview')}
            />
            <ExportActions
              getFile={getFile}
              ready={ready}
              shareTitle={draft.recipient.trim() || t('tools.courseCertificate.title')}
              format={t('courseCertificate.format', {
                size: paper,
                mm: `${PAPER[draft.size].widthMm} × ${PAPER[draft.size].heightMm}`,
              })}
              details={exportDetails}
            >
              <PdfButton
                width={print.width}
                height={print.height}
                widthMm={print.widthMm}
                heightMm={print.heightMm}
                draw={drawPrint}
                prepare={prepare}
                fileName={fileNameFor('certificate', draft.recipient, 'pdf')}
                details={exportDetails}
              />
            </ExportActions>
          </>
        }
        footer={
          <BookingPitch
            title={t('courseCertificate.pitch.title')}
            body={t('courseCertificate.pitch.body')}
            source="course-certificate"
          />
        }
      />
    </ToolLayout>
  )
}
