import { useState } from 'react'
import { X, Sparkles, ArrowRight, CheckCircle2, AlertCircle, User, Building2, Phone, Mail, MessageSquare } from 'lucide-react'
import { submitDemoRequest } from '@/services/demo.service'
import { ModalShell } from '@/components/ModalShell/ModalShell'
import { useT } from '@/i18n'
import s from './DemoModal.module.scss'

interface Props {
  open: boolean
  onClose: () => void
}

type Errors = Partial<Record<'name' | 'contact', string>>

const EMPTY = { name: '', company: '', phone: '', email: '', notes: '' }

export function DemoModal({ open, onClose }: Props) {
  const t = useT()
  const [form, setForm] = useState(EMPTY)
  const [errs, setErrs] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState(false)

  // Reset the form once the modal has fully closed.
  const handleClosed = () => {
    onClose()
    setForm(EMPTY); setErrs({}); setSubmitError(''); setDone(false)
  }

  const set = (k: keyof typeof EMPTY, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (k === 'name') setErrs(e => ({ ...e, name: undefined }))
    if (k === 'phone' || k === 'email') setErrs(e => ({ ...e, contact: undefined }))
    setSubmitError('')
  }

  const validate = (): boolean => {
    const e: Errors = {}
    if (!form.name.trim()) e.name = t('demo.errRequired')
    if (!form.phone.trim() && !form.email.trim()) e.contact = t('demo.errContact')
    setErrs(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (submitting) return
    if (!validate()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await submitDemoRequest({
        name: form.name.trim(),
        company: form.company.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
      })
      setDone(true)
    } catch (err) {
      const code = (err as { code?: string } | null)?.code
      setSubmitError(code === 'NETWORK' ? t('demo.errNetwork') : t('demo.errGeneric'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell open={open} onClose={handleClosed}>
      {({ closing, requestClose }) => (
        <div
          className={[s.overlay, closing ? s.closing : ''].filter(Boolean).join(' ')}
          onClick={requestClose}
        >
          <div
            className={[s.modal, closing ? s.closing : ''].filter(Boolean).join(' ')}
            onClick={e => e.stopPropagation()}
          >
            <button className={s.close} onClick={requestClose} aria-label={t('demo.close')}>
              <X size={18} />
            </button>

        {done ? (
          <div className={s.success}>
            <div className={s.successIcon}><CheckCircle2 size={34} /></div>
            <h2 className={s.successTitle}>{t('demo.successTitle')}</h2>
            <p className={s.successText}>{t('demo.successText')}</p>
            <button className={s.submitBtn} onClick={requestClose}>{t('demo.done')}</button>
          </div>
        ) : (
          <>
            {/* Header band */}
            <div className={s.head}>
              <div className={s.headGrid} />
              <span className={s.eyebrow}><Sparkles size={13} /> {t('demo.eyebrow')}</span>
              <h2 className={s.title}>{t('demo.title')}</h2>
              <p className={s.subtitle}>{t('demo.subtitle')}</p>
            </div>

            <div className={s.body}>
              {submitError && (
                <div className={s.errorBanner} role="alert">
                  <AlertCircle size={16} /> <span>{submitError}</span>
                </div>
              )}

              <Field
                icon={<User size={15} />}
                label={t('demo.name')}
                placeholder={t('demo.namePlaceholder')}
                value={form.name}
                onChange={v => set('name', v)}
                error={errs.name}
              />

              <Field
                icon={<Building2 size={15} />}
                label={t('demo.company')}
                optional={t('demo.optional')}
                placeholder={t('demo.companyPlaceholder')}
                value={form.company}
                onChange={v => set('company', v)}
              />

              <div className={s.row}>
                <Field
                  icon={<Phone size={15} />}
                  label={t('demo.phone')}
                  placeholder="+374 …"
                  value={form.phone}
                  onChange={v => set('phone', v)}
                  inputMode="tel"
                />
                <Field
                  icon={<Mail size={15} />}
                  label={t('demo.email')}
                  placeholder="you@salon.am"
                  value={form.email}
                  onChange={v => set('email', v)}
                  inputMode="email"
                />
              </div>
              {errs.contact && (
                <span className={s.fieldError}><AlertCircle size={13} /> {errs.contact}</span>
              )}

              <Field
                icon={<MessageSquare size={15} />}
                label={t('demo.notes')}
                optional={t('demo.optional')}
                placeholder={t('demo.notesPlaceholder')}
                value={form.notes}
                onChange={v => set('notes', v)}
                textarea
              />

              <button className={s.submitBtn} onClick={handleSubmit} disabled={submitting}>
                {submitting ? t('demo.submitting') : <>{t('demo.submit')} <ArrowRight size={17} /></>}
              </button>
              <p className={s.privacy}>{t('demo.privacy')}</p>
            </div>
          </>
        )}
          </div>
        </div>
      )}
    </ModalShell>
  )
}

interface FieldProps {
  icon: React.ReactNode
  label: string
  optional?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  error?: string
  textarea?: boolean
  inputMode?: 'tel' | 'email'
}

function Field({ icon, label, optional, placeholder, value, onChange, error, textarea, inputMode }: FieldProps) {
  return (
    <div className={s.field}>
      <label className={s.label}>
        {label}{optional && <span className={s.optional}> · {optional}</span>}
      </label>
      <div className={[s.inputWrap, textarea ? s.inputWrapArea : '', error ? s.hasError : ''].filter(Boolean).join(' ')}>
        <span className={s.inputIcon}>{icon}</span>
        {textarea ? (
          <textarea
            className={[s.input, s.textarea].join(' ')}
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
            rows={3}
          />
        ) : (
          <input
            className={s.input}
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
            inputMode={inputMode}
          />
        )}
      </div>
      {error && <span className={s.fieldError}><AlertCircle size={13} /> {error}</span>}
    </div>
  )
}
