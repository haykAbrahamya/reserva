import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AtSign, ExternalLink, Eye, MapPin, Pencil, Phone, Scissors } from 'lucide-react'
import { AvatarPicker, Button, Input, NumberStepper, Textarea } from '@reserva/ui'
import { resolveImageUrl } from '@/api/client'
import type { ProfileInput } from '@/api/professionals.api'
import { AreaPicker } from '@/components/common/AreaPicker/AreaPicker'
import { SpecialtyPicker } from '@/components/common/SpecialtyPicker/SpecialtyPicker'
import { useProfessionalAuth } from '@/auth/ProfessionalAuth'
import { useT } from '@/i18n'
import { useTaxonomy } from '@/lib/taxonomy'
import s from './ProfileSection.module.scss'

/**
 * The profile's details, in two modes.
 *
 * Deliberately does NOT show the photo, the name or the headline: the shell
 * above already does, and an earlier version repeated all three here — so on a
 * phone you scrolled past your own face twice inside one screen. What is left
 * is what a salon reads AFTER deciding to look: what you do, where, and how to
 * reach you.
 *
 * Edit is a mode rather than a separate route. It is the same content with
 * controls swapped in, and a URL change would throw away the scroll position of
 * a long page for nothing.
 */
export function ProfileSection() {
  const { professional } = useProfessionalAuth()
  const [editing, setEditing] = useState(false)

  // The shell has already refused to render without one.
  if (!professional) return null

  return editing ? (
    <EditProfile onDone={() => setEditing(false)} />
  ) : (
    <ViewProfile onEdit={() => setEditing(true)} />
  )
}

// ── View ─────────────────────────────────────────────────────

function ViewProfile({ onEdit }: { onEdit: () => void }) {
  const t = useT()
  const { professional } = useProfessionalAuth()
  const { specialtyNames, areaNames, loading } = useTaxonomy()
  if (!professional) return null

  const specialties = specialtyNames(professional.specialtyKeys)
  const areas = areaNames(professional.areaKeys)

  return (
    <div className={s.panel}>
      <header className={s.head}>
        <h2 className={s.heading}>{t('account.profile')}</h2>
        <div className={s.headActions}>
          {/* Only offered once the page actually exists — a "view public
              profile" link that 404s is worse than no link. */}
          {professional.publicProfile && (
            <Link className={s.ghostBtn} to={`/specialists/${professional.id}`}>
              <Eye size={15} />
              <span className={s.ghostLabel}>{t('account.viewPublic')}</span>
              <ExternalLink size={13} className={s.ghostIcon} />
            </Link>
          )}
          <Button variant="accent" onClick={onEdit} className={s.editBtn}>
            <Pencil size={15} />
            {t('account.edit')}
          </Button>
        </div>
      </header>

      <section className={s.block}>
        <h3 className={s.blockTitle}>{t('specialist.specialties')}</h3>
        {specialties.length > 0 ? (
          <div className={s.chips}>
            {specialties.map((label) => (
              <span key={label} className={s.chip}>
                <Scissors size={12} />
                {label}
              </span>
            ))}
          </div>
        ) : (
          !loading && <p className={s.missing}>{t('account.missing.specialties')}</p>
        )}
      </section>

      <section className={s.block}>
        <h3 className={s.blockTitle}>{t('specialist.areas')}</h3>
        {areas.length > 0 ? (
          <div className={s.chips}>
            {areas.map((label) => (
              <span key={label} className={[s.chip, s.chipQuiet].join(' ')}>
                <MapPin size={12} />
                {label}
              </span>
            ))}
          </div>
        ) : (
          !loading && <p className={s.missing}>{t('account.missing.areas')}</p>
        )}
      </section>

      <section className={s.block}>
        <h3 className={s.blockTitle}>{t('specialist.about')}</h3>
        {professional.about.trim() ? (
          <p className={s.about}>{professional.about}</p>
        ) : (
          <p className={s.missing}>{t('account.missing.about')}</p>
        )}
      </section>

      <section className={s.block}>
        <h3 className={s.blockTitle}>{t('account.contact')}</h3>
        <dl className={s.contactList}>
          <div className={s.contactRow}>
            <dt className={s.contactLabel}>
              <Phone size={14} />
              {t('specialist.phone')}
            </dt>
            <dd className={s.contactValue}>{professional.phone}</dd>
          </div>
          <div className={s.contactRow}>
            <dt className={s.contactLabel}>
              <AtSign size={14} />
              {t('specialist.email')}
            </dt>
            <dd
              className={[s.contactValue, professional.email ? '' : s.contactEmpty]
                .filter(Boolean)
                .join(' ')}
            >
              {professional.email || t('account.missing.email')}
            </dd>
          </div>
        </dl>
        {/* Said here, next to the numbers themselves, rather than only on the
            settings screen — this is where somebody wonders about it. */}
        <p className={s.contactNote}>
          {professional.showContact ? t('account.contactShown') : t('account.contactHidden')}
        </p>
      </section>
    </div>
  )
}

// ── Edit ─────────────────────────────────────────────────────

function EditProfile({ onDone }: { onDone: () => void }) {
  const t = useT()
  const { professional, updateProfile, media } = useProfessionalAuth()
  const { groups, areaTree, loading: catalogsLoading } = useTaxonomy()

  // Seeded once from the profile. Not synced afterwards: a background refresh
  // must never overwrite what someone is in the middle of typing.
  const [name, setName] = useState(professional?.name ?? '')
  const [phone, setPhone] = useState(professional?.phone ?? '')
  const [email, setEmail] = useState(professional?.email ?? '')
  const [about, setAbout] = useState(professional?.about ?? '')
  const [years, setYears] = useState<number | null>(professional?.experienceYears ?? null)
  const [specialtyKeys, setSpecialtyKeys] = useState<string[]>(professional?.specialtyKeys ?? [])
  const [areaKeys, setAreaKeys] = useState<string[]>(professional?.areaKeys ?? [])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)

  if (!professional) return null

  /*
   * The photo saves IMMEDIATELY; everything else saves on submit.
   *
   * Not an inconsistency — a different kind of edit. A file has already been
   * chosen from a picker by the time it reaches here, there is nothing to
   * revise about it, and holding it hostage to a Save button at the bottom of a
   * long form is how people end up with a profile whose photo silently never
   * uploaded. Text can be typed wrong, so text gets a Cancel.
   */
  const onPickPhoto = async (file: File) => {
    setError('')
    setPhotoBusy(true)
    try {
      await media.setAvatar(file)
    } catch {
      setError(t('account.photoFailed'))
    } finally {
      setPhotoBusy(false)
    }
  }

  const onClearPhoto = async () => {
    setError('')
    setPhotoBusy(true)
    try {
      await media.clearAvatar()
    } catch {
      setError(t('account.photoFailed'))
    } finally {
      setPhotoBusy(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (name.trim().length < 2) {
      setError(t('account.errors.name'))
      return
    }
    setSaving(true)
    const input: ProfileInput = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      about: about.trim(),
      experienceYears: years,
      specialtyKeys,
      areaKeys,
    }
    try {
      await updateProfile(input)
      onDone()
    } catch (err) {
      // The two the server can legitimately refuse: a number or an address
      // that already belongs to another account.
      const code = (err as { code?: string })?.code ?? ''
      setError(
        code === 'PHONE_TAKEN'
          ? t('account.errors.phoneTaken')
          : code === 'EMAIL_TAKEN'
            ? t('account.errors.emailTaken')
            : t('account.errors.generic'),
      )
      setSaving(false)
    }
  }

  return (
    <form className={s.panel} onSubmit={submit} noValidate>
      <header className={s.head}>
        <h2 className={s.heading}>{t('account.editProfile')}</h2>
      </header>

      {error && <p className={s.error}>{error}</p>}

      <AvatarPicker
        currentUrl={resolveImageUrl(professional.avatarUrl) ?? ''}
        name={professional.name}
        accent="var(--accent)"
        busy={photoBusy}
        onPick={(file) => void onPickPhoto(file)}
        onClear={() => void onClearPhoto()}
        onError={setError}
        footer={photoBusy ? t('account.uploading') : undefined}
        labels={{
          title: t('account.photo.title'),
          hint: t('account.photo.hint'),
          upload: t('account.photo.upload'),
          change: t('account.photo.change'),
          remove: t('account.photo.remove'),
          notImage: t('account.photo.notImage'),
          tooLarge: t('account.photo.tooLarge'),
        }}
      />

      <div className={s.grid}>
        <Input label={t('specialist.name')} value={name} onChange={(e) => setName(e.target.value)} />
        <Input label={t('specialist.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input
          label={t('specialist.email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('specialist.emailPlaceholder')}
        />
      </div>

      <div className={s.field}>
        <span className={s.fieldLabel}>{t('specialist.specialties')}</span>
        <SpecialtyPicker
          groups={groups}
          selected={specialtyKeys}
          onChange={setSpecialtyKeys}
          loading={catalogsLoading}
        />
      </div>

      <div className={s.field}>
        <span className={s.fieldLabel}>{t('specialist.areas')}</span>
        <span className={s.fieldHint}>{t('specialist.areasHint')}</span>
        <AreaPicker tree={areaTree} selected={areaKeys} onChange={setAreaKeys} loading={catalogsLoading} />
      </div>

      <NumberStepper
        label={t('specialist.years')}
        value={years}
        onChange={setYears}
        min={0}
        max={60}
        emptyLabel={t('specialist.yearsUnset')}
        format={(n) => t('specialist.yearsValue', { count: n })}
        ariaLabel={t('specialist.years')}
        decrementLabel={t('specialist.yearsLess')}
        incrementLabel={t('specialist.yearsMore')}
        quickPicks={[
          { value: 0, label: t('specialist.yearsNew') },
          { value: 2, label: '2' },
          { value: 5, label: '5' },
          { value: 10, label: '10' },
          { value: null, label: t('specialist.yearsSkip') },
        ]}
      />

      <Textarea
        label={t('specialist.about')}
        value={about}
        onChange={(e) => setAbout(e.target.value)}
        rows={5}
        maxLength={1200}
        placeholder={t('specialist.aboutPlaceholder')}
      />

      <div className={s.actions}>
        <Button type="button" onClick={onDone} disabled={saving}>
          {t('account.cancel')}
        </Button>
        <Button type="submit" variant="accent" disabled={saving}>
          {saving ? t('account.saving') : t('account.save')}
        </Button>
      </div>
    </form>
  )
}
