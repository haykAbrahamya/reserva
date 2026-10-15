import { useEffect, useState } from 'react'
import { Search, Loader2, Check } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { useT } from '@/i18n'
import { useAuthStore } from '@/store/auth.store'
import { useAppStore } from '@/store/app.store'
import { superAdminService, type SuperPartner } from '@/services/superAdmin.service'
import { errorMessage } from '@/utils/errors'
import s from './PartnerPicker.module.scss'

interface Props {
  /** The partner already entered, marked in the list. */
  currentId?: string
}

/**
 * Every partner a super admin can enter, searchable. Picking one enters it and
 * reloads the whole app — nothing of the partner on screen before may linger.
 */
export function PartnerPicker({ currentId }: Props) {
  const t = useT()
  const [search, setSearch] = useState('')
  const [partners, setPartners] = useState<SuperPartner[] | null>(null)
  const [opening, setOpening] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    const id = setTimeout(() => {
      superAdminService
        .partners(search.trim() || undefined)
        .then((list) => { if (live) { setPartners(list); setError(null) } })
        .catch((err) => { if (live) setError(errorMessage(err, t)) })
    }, search ? 250 : 0)
    return () => { live = false; clearTimeout(id) }
  }, [search, t])

  const enter = async (p: SuperPartner) => {
    if (opening) return
    setOpening(p.id)
    setError(null)
    try {
      const { token, user } = await superAdminService.enter(p.id)
      useAuthStore.getState().login(token, user)
      // The previous partner's choices must not carry over.
      useAppStore.getState().setPartnerId('')
      useAppStore.getState().setActiveProduct(null)
      window.location.assign('/')
    } catch (err) {
      setError(errorMessage(err, t))
      setOpening(null)
    }
  }

  return (
    <div className={s.picker}>
      <div className={s.searchWrap}>
        <Search size={15} className={s.searchIcon} />
        <input
          className={s.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('superAdmin.search')}
          autoFocus
        />
      </div>

      {error && <div className={s.error}>{error}</div>}

      <div className={s.list}>
        {partners === null ? (
          <div className={s.state}><Loader2 size={18} className={s.spin} /></div>
        ) : partners.length === 0 ? (
          <div className={s.state}>{t('superAdmin.noPartners')}</div>
        ) : (
          partners.map((p) => (
            <button
              key={p.id}
              type="button"
              className={[s.item, p.id === currentId ? s.current : ''].filter(Boolean).join(' ')}
              onClick={() => enter(p)}
              disabled={!!opening}
            >
              <Avatar name={p.name} size="md" style={{ background: p.accent, color: 'white', border: 'none' }} />
              <span className={s.info}>
                <span className={s.name}>{p.name}</span>
                <span className={s.meta}>{[p.type, p.slug ? `/${p.slug}` : null].filter(Boolean).join(' · ')}</span>
              </span>
              {!p.active && <span className={s.off}>{t('superAdmin.inactive')}</span>}
              {opening === p.id
                ? <Loader2 size={16} className={s.spin} aria-label={t('superAdmin.opening')} />
                : p.id === currentId && <Check size={16} className={s.check} />}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
