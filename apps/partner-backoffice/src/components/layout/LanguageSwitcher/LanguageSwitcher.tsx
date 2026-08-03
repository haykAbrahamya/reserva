import { useRef, useEffect, useState } from 'react'
import { Check, ChevronDown, Globe } from 'lucide-react'
import { useI18n, LOCALES, LOCALE_META, type Locale } from '@/i18n'
import s from './LanguageSwitcher.module.scss'

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const close = () => {
    setClosing(true)
    setTimeout(() => { setClosing(false); setOpen(false) }, 160)
  }

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (l: Locale) => {
    setLocale(l)
    close()
  }

  const current = LOCALE_META[locale]

  return (
    <div ref={ref} className={s.wrap}>
      <button
        className={[s.trigger, open ? s.open : ''].filter(Boolean).join(' ')}
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('language.switcherAria')}
        title={t('language.label')}
      >
        <Globe size={14} className={s.globe} />
        <span className={s.short}>{current.short}</span>
        <ChevronDown size={12} className={[s.chevron, open ? s.rotated : ''].filter(Boolean).join(' ')} />
      </button>

      {open && (
        <div className={[s.menu, closing ? s.closing : ''].filter(Boolean).join(' ')} role="listbox">
          <div className={s.menuLabel}>{t('language.label')}</div>
          {LOCALES.map((l, i) => {
            const meta = LOCALE_META[l]
            const active = l === locale
            return (
              <button
                key={l}
                role="option"
                aria-selected={active}
                className={[s.item, active ? s.active : ''].filter(Boolean).join(' ')}
                style={{ animationDelay: `${i * 34}ms` }}
                onClick={() => choose(l)}
              >
                <span className={[s.flag, /^[A-Za-z]+$/.test(meta.flag) ? s.flagText : ''].filter(Boolean).join(' ')}>{meta.flag}</span>
                <span className={s.names}>
                  <span className={s.native}>{meta.native}</span>
                  <span className={s.english}>{meta.english}</span>
                </span>
                {active && <Check size={15} className={s.check} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
