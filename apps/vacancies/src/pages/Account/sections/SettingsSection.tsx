import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, Copy, ExternalLink, Globe, LogOut, Phone } from 'lucide-react'
import { Toggle } from '@reserva/ui'
import { useProfessionalAuth } from '@/auth/ProfessionalAuth'
import { useT } from '@/i18n'
import { isWorthPublishing, nextProfileStep, profileCompleteness } from '@/lib/profile'
import s from './SettingsSection.module.scss'

/**
 * Who can see this profile.
 *
 * Two switches, and they are separate on purpose: showing a salon your work and
 * handing it your phone number are different decisions, and bundling them would
 * force the second on anyone who wanted the first. Both start off, because
 * publishing a person's contact details is not something to infer from a click
 * somewhere else.
 *
 * Publishing is never BLOCKED on completeness — it is their page — but a thin
 * profile gets a warning first, because the failure mode is silent: an empty
 * card in a directory does more harm to its owner than an absent one, and
 * nobody finds that out by looking at their own settings screen.
 */
export function SettingsSection() {
  const t = useT()
  const { professional, updateProfile, logout } = useProfessionalAuth()
  const [saving, setSaving] = useState<'public' | 'contact' | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  if (!professional) return null

  const percent = profileCompleteness(professional)
  const thin = !isWorthPublishing(professional)
  const missing = nextProfileStep(professional)
  const url = `${window.location.origin}/specialists/${professional.id}`

  const set = async (field: 'publicProfile' | 'showContact', value: boolean) => {
    setError('')
    setSaving(field === 'publicProfile' ? 'public' : 'contact')
    try {
      await updateProfile({ [field]: value })
    } catch {
      setError(t('account.errors.generic'))
    } finally {
      setSaving(null)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be refused (an insecure origin, a locked-down
      // browser). The link is selectable text right there, so this is a
      // convenience failing, not a feature failing — say nothing.
    }
  }

  return (
    <div className={s.panel}>
      <header className={s.head}>
        <h1 className={s.heading}>{t('account.nav.settings')}</h1>
        <p className={s.sub}>{t('account.settings.sub')}</p>
      </header>

      {error && <p className={s.error}>{error}</p>}

      <div className={s.row}>
        <span className={s.rowIcon}>
          <Globe size={17} />
        </span>
        <div className={s.rowText}>
          <span className={s.rowTitle}>{t('account.settings.publicTitle')}</span>
          <span className={s.rowBody}>{t('account.settings.publicBody')}</span>
        </div>
        <Toggle
          checked={professional.publicProfile}
          onChange={(v) => void set('publicProfile', v)}
          disabled={saving !== null}
          ariaLabel={t('account.settings.publicTitle')}
        />
      </div>

      {/* Shown before publishing, not after — this is advice about a decision
          that has not been made yet. */}
      {!professional.publicProfile && thin && (
        <p className={s.warn}>
          <AlertTriangle size={15} />
          <span>
            {t('account.settings.thin', { percent })}
            {missing && ` ${t(`account.settings.missing.${missing}`)}`}
          </span>
        </p>
      )}

      {professional.publicProfile && (
        <div className={s.linkBox}>
          <span className={s.linkLabel}>{t('account.settings.yourLink')}</span>
          <code className={s.link}>{url}</code>
          <div className={s.linkActions}>
            <button type="button" className={s.linkBtn} onClick={() => void copy()}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? t('account.settings.copied') : t('account.settings.copy')}
            </button>
            <Link className={s.linkBtn} to={`/specialists/${professional.id}`}>
              <ExternalLink size={14} />
              {t('account.viewPublic')}
            </Link>
          </div>
        </div>
      )}

      <div className={s.row}>
        <span className={s.rowIcon}>
          <Phone size={17} />
        </span>
        <div className={s.rowText}>
          <span className={s.rowTitle}>{t('account.settings.contactTitle')}</span>
          <span className={s.rowBody}>{t('account.settings.contactBody')}</span>
        </div>
        <Toggle
          checked={professional.showContact}
          onChange={(v) => void set('showContact', v)}
          disabled={saving !== null}
          ariaLabel={t('account.settings.contactTitle')}
        />
      </div>

      {/* Only meaningful once there is a page for it to apply to. */}
      {professional.showContact && !professional.publicProfile && (
        <p className={s.note}>{t('account.settings.contactMoot')}</p>
      )}

      {/*
        Sign out lives here rather than in the rail.
        It was a full-width button sitting between the navigation and the
        content on a phone — the most prominent control on a screen about
        someone's profile was the one that throws them out of it. Settings is
        where people go looking for it, and it is a link-weight action here
        rather than a button competing with the switches above.
      */}
      <button type="button" className={s.signOut} onClick={logout}>
        <span className={[s.rowIcon, s.signOutIcon].join(' ')}>
          <LogOut size={17} />
        </span>
        <span className={s.rowText}>
          <span className={s.rowTitle}>{t('account.signOutTitle')}</span>
          <span className={s.rowBody}>{t('account.signOutBody')}</span>
        </span>
      </button>
    </div>
  )
}
