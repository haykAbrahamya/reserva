import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Briefcase, LogOut } from 'lucide-react'
import { Button, Input, Textarea, Empty } from '@reserva/ui'
import { fetchMeta } from '@/api/board.api'
import { fetchMyApplications } from '@/api/professionals.api'
import { SpecialtyPicker } from '@/components/common/SpecialtyPicker/SpecialtyPicker'
import { Header } from '@/components/layout/Header/Header'
import { useProfessionalAuth } from '@/auth/ProfessionalAuth'
import { useI18n, useLocalized, useT } from '@/i18n'
import { relativeTime } from '@/lib/dates'
import { useAsync } from '@/lib/useAsync'
import { useSeo } from '@/lib/useSeo'
import s from './Account.module.scss'

/**
 * The professional's own page: their profile, and what they have applied to.
 *
 * Deliberately small. A job seeker on this board is here to find work, not to
 * maintain a profile — so this is a place to correct a phone number and see
 * whether anyone has read an application, and nothing more. Everything a salon
 * needs is already carried on the application itself.
 */
export function Account() {
  const t = useT()
  const { locale } = useI18n()
  const loc = useLocalized()
  const { professional, loading, signedIn, updateProfile, logout, authed } = useProfessionalAuth()

  useSeo({ title: `${t('account.title')} — ${t('app.product')}`, noIndex: true })

  const applications = useAsync((_signal) => fetchMyApplications(authed), [signedIn], {
    skip: !signedIn,
  })
  const meta = useAsync((signal) => fetchMeta(signal), [])

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [about, setAbout] = useState('')
  const [years, setYears] = useState('')
  const [specialtyKeys, setSpecialtyKeys] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Seed the form from the profile once it lands, and not again — otherwise a
  // background refresh would overwrite whatever they are in the middle of
  // typing.
  const [seeded, setSeeded] = useState(false)
  if (professional && !seeded) {
    setName(professional.name)
    setPhone(professional.phone)
    setEmail(professional.email)
    setAbout(professional.about)
    setYears(professional.experienceYears == null ? '' : String(professional.experienceYears))
    setSpecialtyKeys(professional.specialtyKeys)
    setSeeded(true)
  }

  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setDirty(true)
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      await updateProfile({
        name,
        phone,
        email,
        about,
        experienceYears: years === '' ? null : Number(years),
        specialtyKeys,
      })
      setDirty(false)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  // Wait for the stored session to resolve before deciding — otherwise a
  // refresh on this page bounces the visitor to the login screen they are
  // already past.
  if (loading) return null
  if (!signedIn || !professional) return <Navigate to="/login" replace />

  return (
    <>
      <Header />

      <div className={s.page}>
        <header className={s.head}>
          <div>
            <h1 className={s.title}>{professional.name}</h1>
            <p className={s.subtitle}>{professional.phone}</p>
          </div>
          <button type="button" className={s.logout} onClick={logout}>
            <LogOut size={15} />
            {t('account.logout')}
          </button>
        </header>

        <section className={s.card}>
          <h2 className={s.cardTitle}>{t('account.profile')}</h2>

          <div className={s.grid}>
            <Input label={t('specialist.name')} value={name} onChange={(e) => touch(setName)(e.target.value)} />
            <Input label={t('specialist.phone')} value={phone} onChange={(e) => touch(setPhone)(e.target.value)} />
            <Input
              label={t('specialist.email')}
              type="email"
              value={email}
              onChange={(e) => touch(setEmail)(e.target.value)}
              placeholder={t('specialist.emailPlaceholder')}
            />
          </div>

          <div className={s.field}>
            <span className={s.label}>{t('specialist.specialties')}</span>
            <SpecialtyPicker
              groups={meta.data?.specialtyGroups ?? []}
              selected={specialtyKeys}
              onChange={touch(setSpecialtyKeys)}
              loading={meta.loading && !meta.data}
            />
          </div>

          <Input
            label={t('specialist.years')}
            type="number"
            inputMode="numeric"
            min={0}
            max={60}
            value={years}
            onChange={(e) => touch(setYears)(e.target.value)}
            placeholder={t('specialist.yearsPlaceholder')}
            className={s.yearsInput}
          />

          <Textarea
            label={t('specialist.about')}
            value={about}
            onChange={(e) => touch(setAbout)(e.target.value)}
            rows={4}
            maxLength={1200}
          />

          <div className={s.saveRow}>
            {saved && !dirty && <span className={s.saved}>{t('account.saved')}</span>}
            <Button variant="accent" onClick={save} disabled={!dirty || saving}>
              {saving ? t('account.saving') : t('account.save')}
            </Button>
          </div>
        </section>

        <section className={s.card}>
          <h2 className={s.cardTitle}>{t('account.applications')}</h2>

          {applications.loading && !applications.data ? (
            <p className={s.muted}>{t('results.loading')}</p>
          ) : !applications.data?.length ? (
            <Empty
              icon={Briefcase}
              title={t('account.noApplicationsTitle')}
              description={t('account.noApplicationsBody')}
              action={
                <Link to="/">
                  <Button variant="accent">{t('landing.emptyAction')}</Button>
                </Link>
              }
            />
          ) : (
            <ul className={s.appList}>
              {applications.data.map((a) => (
                <li key={a.id}>
                  <Link className={s.appRow} to={`/v/${a.vacancy.id}`}>
                    <span className={s.appRole}>
                      {loc(a.vacancy.title, a.vacancy.titleI18n).trim() ||
                        loc(a.vacancy.specialty.roleName, a.vacancy.specialty.roleNameI18n)}
                    </span>
                    <span className={s.appSalon}>
                      {loc(a.vacancy.partner.name, a.vacancy.partner.nameI18n)}
                    </span>
                    <span className={s.appWhen}>{relativeTime(a.createdAt, locale)}</span>
                    {/* The salon's triage, in the applicant's words. "new" is
                        shown as "sent" rather than as a status — an applicant
                        should not be reading the salon's inbox labels. */}
                    <span className={[s.appStatus, s[`status_${a.status}`]].filter(Boolean).join(' ')}>
                      {t(`account.status.${a.status}`)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
