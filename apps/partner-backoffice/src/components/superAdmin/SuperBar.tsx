import { useState } from 'react'
import { ShieldCheck, ArrowLeftRight, LogOut } from 'lucide-react'
import { Modal } from '@/components/ui'
import { useT } from '@/i18n'
import { useAuthStore } from '@/store/auth.store'
import { superSession } from '@/services/superSession'
import { superAdminService } from '@/services/superAdmin.service'
import { PartnerPicker } from './PartnerPicker'
import s from './SuperBar.module.scss'

/**
 * Always on screen while a super admin is inside a partner: who is looking,
 * at which partner, and the two ways out — another partner, or leaving. It
 * keeps a super admin from mistaking a partner's backoffice for an ordinary
 * session, and the partner's real team never sees it.
 */
export function SuperBar() {
  const t = useT()
  const session = superSession.get()
  const [switching, setSwitching] = useState(false)
  if (!session?.partner) return null

  const exit = async () => {
    await superAdminService.exit()
    useAuthStore.getState().logout()
    window.location.assign('/super-admin')
  }

  return (
    <div className={s.bar} role="status">
      <ShieldCheck size={15} className={s.icon} />
      <span className={s.text}>
        <span className={s.who}>{t('superAdmin.bar')} · {session.staff.name}</span>
        <span className={s.partner}>{session.partner.name}</span>
      </span>
      <button type="button" className={s.btn} onClick={() => setSwitching(true)} title={t('superAdmin.switch')}>
        <ArrowLeftRight size={14} /> <span className={s.label}>{t('superAdmin.switch')}</span>
      </button>
      <button type="button" className={s.btn} onClick={exit} title={t('superAdmin.exit')}>
        <LogOut size={14} /> <span className={s.label}>{t('superAdmin.exit')}</span>
      </button>

      <Modal open={switching} onClose={() => setSwitching(false)} title={t('superAdmin.switch')} subtitle={t('superAdmin.chooseSubtitle')}>
        <PartnerPicker currentId={session.partner.id} />
      </Modal>
    </div>
  )
}
