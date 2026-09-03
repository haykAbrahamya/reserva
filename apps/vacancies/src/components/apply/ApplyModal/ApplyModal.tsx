import { useState } from 'react'
import { CheckCircle2, Send, ShieldCheck } from 'lucide-react'
import { Button, Input, Modal, Textarea } from '@reserva/ui'
import { isValidPhone, normalizePhoneInput } from '@reserva/shared'
import { applyToVacancy } from '@/api/board.api'
import { ApiError } from '@/api/client'
import { useI18n, useT } from '@/i18n'
import s from './ApplyModal.module.scss'

interface Props {
  open: boolean
  onClose: () => void
  vacancyId: string
  /** For the subtitle — this modal never re-fetches the listing. */
  role: string
  salon: string
}

interface Errors {
  name?: string
  phone?: string
  email?: string
}

type Sent = { updated: boolean } | null

/**
 * The apply form.
 *
 * Two required fields, name and phone, and nothing else. This is an
 * unauthenticated form on a page a stranger reached from a search engine, and
 * every additional required field is a person who does not apply. The message
 * is optional because some people have more to say than a number carries, and
 * the salon reads it — but nobody is stopped by it.
 *
 * Validation runs on SUBMIT, not per keystroke. Marking a half-typed phone
 * number as invalid while someone is still typing it is the single most
 * irritating thing a form can do.
 */
export function ApplyModal({ open, onClose, vacancyId, role, salon }: Props) {
  const t = useT()
  const { locale } = useI18n()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')

  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<Sent>(null)

  const reset = () => {
    setName('')
    setPhone('')
    setEmail('')
    setNote('')
    setErrors({})
    setFailure(null)
    setSent(null)
  }

  const close = () => {
    onClose()
    // Cleared after the closing animation, so the fields do not visibly empty
    // themselves while the sheet is still on screen.
    window.setTimeout(reset, 300)
  }

  const validate = (): Errors => {
    const next: Errors = {}
    if (name.trim().length < 2) next.name = t('apply.errors.name')

    const cleaned = normalizePhoneInput(phone)
    if (!cleaned) next.phone = t('apply.errors.phoneRequired')
    // Validated with the SAME helper the rest of the product uses, so a number
    // this form accepts is one the backoffice can dial.
    else if (!isValidPhone(cleaned)) next.phone = t('apply.errors.phoneInvalid')

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = t('apply.errors.email')
    }
    return next
  }

  const submit = async () => {
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSending(true)
    setFailure(null)
    try {
      const result = await applyToVacancy(vacancyId, {
        name: name.trim(),
        phone: normalizePhoneInput(phone),
        email: email.trim(),
        note: note.trim(),
        locale,
      })
      setSent({ updated: result.updated })
    } catch (err) {
      // The backend's message is developer-facing English, so the CODE is what
      // gets translated — never the raw text.
      const code = err instanceof ApiError ? err.code : 'UNKNOWN'
      if (code === 'NOT_FOUND') setFailure(t('errors.gone'))
      else if (code === 'RATE_LIMITED') setFailure(t('errors.rate'))
      else if (code === 'VALIDATION_FAILED') setFailure(t('errors.phoneOnly'))
      else if (code === 'NETWORK') setFailure(t('errors.network'))
      else setFailure(t('errors.generic'))
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <Modal
        open={open}
        onClose={close}
        title={sent.updated ? t('apply.updatedTitle') : t('apply.successTitle')}
      >
        <div className={s.success}>
          <CheckCircle2 size={38} strokeWidth={1.4} className={s.successIcon} />
          <p className={s.successBody}>
            {sent.updated ? t('apply.updatedBody') : t('apply.successBody', { salon })}
          </p>
          <Button variant="accent" onClick={close}>
            {t('apply.done')}
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={t('apply.title')}
      subtitle={t('apply.subtitle', { role, salon })}
      footer={
        <div className={s.footer}>
          <Button variant="ghost" onClick={close} disabled={sending}>
            {t('apply.cancel')}
          </Button>
          <Button variant="accent" onClick={submit} disabled={sending}>
            <Send size={14} />
            {sending ? t('apply.sending') : t('apply.submit')}
          </Button>
        </div>
      }
    >
      <div className={s.form}>
        {failure && <p className={s.failure}>{failure}</p>}

        <Input
          label={t('apply.name')}
          placeholder={t('apply.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoComplete="name"
        />

        <Input
          label={t('apply.phone')}
          placeholder="+374 __ ______"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          help={t('apply.phoneHelp')}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
        />

        <Input
          label={`${t('apply.email')} · ${t('apply.emailOptional')}`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          type="email"
          inputMode="email"
          autoComplete="email"
        />

        <Textarea
          label={`${t('apply.note')} · ${t('apply.noteOptional')}`}
          placeholder={t('apply.notePlaceholder')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={1200}
        />

        {/* Said plainly, because a stranger typing their phone number into an
            unfamiliar site deserves to know where it goes. */}
        <p className={s.privacy}>
          <ShieldCheck size={13} />
          {t('apply.privacy')}
        </p>
      </div>
    </Modal>
  )
}
