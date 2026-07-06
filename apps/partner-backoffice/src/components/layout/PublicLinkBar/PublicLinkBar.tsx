import { useState } from 'react'
import { Globe, Copy, Check, ExternalLink } from 'lucide-react'
import { usePartner } from '@/store/app.store'
import { useT } from '@/i18n'
import s from './PublicLinkBar.module.scss'

/**
 * A slim bar beneath the topbar that surfaces the partner's live public booking
 * page (link + quick Copy / Open). Shown ONLY once a slug is set — while it's
 * still missing, the "Complete your profile" onboarding checklist owns that
 * guidance, so we render nothing here to avoid a duplicate call-to-action.
 */
export function PublicLinkBar() {
  const partner = usePartner()
  const t = useT()
  const [copied, setCopied] = useState(false)

  // Nothing to show until the profile loads, or before a slug is configured
  // (the onboarding checklist guides that step instead).
  if (!partner?.slug) return null

  const slug = partner.slug
  const url = `https://${slug}.reserva.am`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked (insecure context / permissions) — silently ignore */
    }
  }

  // ── Configured: live link + actions ──
  const liveUrl = url
  return (
    <div className={s.bar}>
      <span className={s.iconWrap}><Globe size={15} /></span>
      <span className={s.label}>{t('publicLink.yourPage')}</span>
      <a className={s.link} href={liveUrl} target="_blank" rel="noopener noreferrer">
        {slug}.reserva.am
      </a>
      <div className={s.spacer} />
      <button className={s.action} onClick={copy} title={t('publicLink.copy')}>
        {copied
          ? <><Check size={14} className={s.ok} /> <span className={s.actionLabel}>{t('publicLink.copied')}</span></>
          : <><Copy size={14} /> <span className={s.actionLabel}>{t('publicLink.copy')}</span></>}
      </button>
      <a className={s.action} href={liveUrl} target="_blank" rel="noopener noreferrer" title={t('publicLink.open')}>
        <ExternalLink size={14} /> <span className={s.actionLabel}>{t('publicLink.open')}</span>
      </a>
    </div>
  )
}
