import { Navigate } from 'react-router-dom'
import { ShieldCheck, LogOut } from 'lucide-react'
import { useT } from '@/i18n'
import { superSession } from '@/services/superSession'
import { superAdminService } from '@/services/superAdmin.service'
import { PartnerPicker } from '@/components/superAdmin/PartnerPicker'
import s from './ChoosePartner.module.scss'

/** Signed in as a super admin, no partner yet: choose one. Nothing else is reachable until then. */
export function ChoosePartner() {
  const t = useT()
  const session = superSession.get()
  if (!session) return <Navigate to="/super-admin" replace />

  const exit = async () => {
    await superAdminService.exit()
    window.location.assign('/super-admin')
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.head}>
          <span className={s.badge}><ShieldCheck size={13} /> {t('superAdmin.bar')} · {session.staff.name}</span>
          <h1 className={s.title}>{t('superAdmin.chooseTitle')}</h1>
          <p className={s.subtitle}>{t('superAdmin.chooseSubtitle')}</p>
        </div>
        <PartnerPicker currentId={session.partner?.id} />
        <button type="button" className={s.exit} onClick={exit}>
          <LogOut size={14} /> {t('superAdmin.exit')}
        </button>
      </div>
    </div>
  )
}
