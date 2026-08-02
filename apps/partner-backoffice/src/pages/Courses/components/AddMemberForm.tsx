import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { normalizePhoneInput, isValidPhone } from '@reserva/shared'
import { useI18n } from '@/i18n'
import type { AddMemberInput } from '@/services/courses.service'
import s from './AddMemberForm.module.scss'

interface Props {
  saving: boolean
  onAdd: (data: AddMemberInput) => void
}

/** Inline "add a member" form — name + phone (with the +374 default), optional
 *  email. Kept small and self-contained; validation mirrors the backend. */
export function AddMemberForm({ saving, onAdd }: Props) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('+374')
  const [email, setEmail] = useState('')
  const [errs, setErrs] = useState<Record<string, string>>({})

  const submit = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = t('errors.required')
    if (!isValidPhone(phone)) e.phone = phone.trim() && phone !== '+374' ? t('errors.invalid') : t('errors.required')
    setErrs(e)
    if (Object.keys(e).length) return
    onAdd({ memberName: name.trim(), memberPhone: phone, memberEmail: email.trim() || undefined })
    setName(''); setPhone('+374'); setEmail(''); setErrs({})
  }

  return (
    <div className={s.form}>
      <div className={s.fields}>
        <Input
          label={t('courses.members.nameLabel')}
          placeholder={t('courses.members.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errs.name}
        />
        <Input
          label={t('courses.members.phoneLabel')}
          placeholder={t('courses.members.phonePlaceholder')}
          value={phone}
          onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
          inputMode="tel"
          error={errs.phone}
        />
        <div className={s.emailField}>
          <Input
            label={t('courses.members.emailLabel')}
            placeholder={t('courses.members.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
        </div>
      </div>
      <Button variant="accent" className={s.submit} disabled={saving} onClick={submit}>
        <UserPlus size={15} /> {saving ? t('common.saving') : t('courses.members.add')}
      </Button>
    </div>
  )
}
