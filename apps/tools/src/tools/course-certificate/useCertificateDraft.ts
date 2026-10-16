import { useCallback, useMemo } from 'react'
import type { Locale } from '@/i18n'
import { toolEvents } from '@/lib/analytics/pulse'
import { today } from '@/lib/dates'
import type { StoryThemeId } from '@/lib/story/themes'
import { useStoredDraft } from '@/lib/useStoredDraft'
import { nextNumber, parseDraft, type CertLayout, type CertificateDraft, type PaperSize, type Signer } from './model'
import { sampleDraft } from './samples'

const STORAGE_KEY = 'reserva-tools:course-certificate:v1'
const events = toolEvents('courseCertificate')

export type CertField = keyof Pick<
  CertificateDraft,
  'school' | 'link' | 'heading' | 'recipient' | 'wording' | 'course' | 'details' | 'city' | 'date' | 'number'
>

/** The certificate draft and every edit to it, remembered in this browser. */
export function useCertificateDraft(locale: Locale) {
  const [draft, setStored] = useStoredDraft(STORAGE_KEY, parseDraft, () => sampleDraft(locale, today()))
  // Every change goes through here, so the first one in a page view is counted.
  const setDraft: typeof setStored = useCallback((next) => {
    events.edited()
    setStored(next)
  }, [setStored])

  const actions = useMemo(
    () => ({
      setField(field: CertField, value: string) {
        setDraft((d) => ({ ...d, [field]: value }))
      },

      setTheme(themeId: StoryThemeId) {
        setDraft((d) => ({ ...d, themeId }))
        events.action('theme', themeId)
      },

      setLayout(layout: CertLayout) {
        setDraft((d) => ({ ...d, layout }))
        events.action('layout', layout)
      },

      setSize(size: PaperSize) {
        setDraft((d) => ({ ...d, size }))
        events.action('size', size)
      },

      setSigner(index: 0 | 1, patch: Partial<Signer>) {
        setDraft((d) => {
          const signers: [Signer, Signer] = [...d.signers]
          signers[index] = { ...signers[index], ...patch }
          return { ...d, signers }
        })
      },

      setSeal(seal: boolean) {
        setDraft((d) => ({ ...d, seal }))
      },

      /** The next number, for the next student's certificate. */
      bumpNumber() {
        setDraft((d) => ({ ...d, number: nextNumber(d.number) }))
        events.action('code')
      },
    }),
    [setDraft],
  )

  return { draft, ...actions }
}
