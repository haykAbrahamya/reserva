import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, Copy, Check, ExternalLink, ArrowRight, Sparkles } from 'lucide-react'
import { usePartner } from '@/store/app.store'
import { useIsAdmin } from '@/store/auth.hooks'
import { useT } from '@/i18n'
import s from './PublicLinkBar.module.scss'

/**
 * A slim, always-visible bar beneath the topbar that surfaces the partner's
 * public booking page. A freshly-activated partner otherwise has no idea their
 * page exists — so:
 *  - if no slug is set yet, show a prominent call-to-action that deep-links to
 *    Settings with the address card highlighted;
 *  - once set, show the live link with quick Copy / Open actions.
 */
export function PublicLinkBar() {
  const partner = usePartner()
  const isAdmin = useIsAdmin()
  const navigate = useNavigate()
  const t = useT()
  const [copied, setCopied] = useState(false)

  // Until the partner profile is loaded there's nothing meaningful to show.
  if (!partner) return null

  const slug = partner.slug
  const url = slug ? `https://${slug}.reserva.am` : null

  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked (insecure context / permissions) — silently ignore */
    }
  }

  // ── Not configured: setup CTA ──
  if (!slug) {
    return (
      <div className={`${s.bar} ${s.setup}`}>
        <span className={s.iconWrap}><Sparkles size={15} /></span>
        <div className={s.text}>
          <span className={s.title}>{t('publicLink.setupTitle')}</span>
          <span className={s.desc}>{t('publicLink.setupDesc')}</span>
        </div>
        {isAdmin ? (
          <button
            className={s.cta}
            onClick={() => navigate('/settings?highlight=address')}
          >
            {t('publicLink.setupBtn')} <ArrowRight size={14} />
          </button>
        ) : (
          <span className={s.adminHint}>{t('publicLink.adminHint')}</span>
        )}
      </div>
    )
  }

  // ── Configured: live link + actions ──
  // `slug` is non-null past the guard above, so the URL is always a string here.
  const liveUrl = `https://${slug}.reserva.am`
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
