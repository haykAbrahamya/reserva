import { HelpCircle, Plus } from 'lucide-react'
import { useT } from '@/i18n'
import { useIsMobile } from '@/hooks/useIsMobile'
import { usePartner } from '@/store/app.store'
import { useNewBooking } from '@/App'
import { useSupport } from './SupportProvider'
import { SupportPanel } from './SupportPanel'
import s from './SupportWidget.module.scss'

/**
 * The web floating action button + support chat surface. Its behavior follows the
 * partner's `supportWidget` preference:
 *  - support → "?" bubble that opens the chat (unread dot).
 *  - book    → "+" bubble that opens the new-booking flow.
 *  - hidden  → nothing.
 * On mobile the FAB lives in the tab bar (MobileTabBar), so here we only render
 * the bubble on web; the chat panel (bottom sheet on mobile) renders in both.
 */
export function SupportWidget() {
  const t = useT()
  const isMobile = useIsMobile()
  const partner = usePartner()
  const openNewBooking = useNewBooking()
  const { open, unread, openChat, closeChat } = useSupport()

  const mode = partner?.supportWidget ?? 'support'

  return (
    <>
      {/* Floating bubble — web only, never while the chat is open. */}
      {!isMobile && !open && mode !== 'hidden' && (
        mode === 'support' ? (
          <button className={s.bubble} onClick={openChat} aria-label={t('support.open')}>
            <HelpCircle size={24} />
            {unread > 0 && <span className={s.dot} />}
          </button>
        ) : (
          <button className={s.bubble} onClick={openNewBooking} aria-label={t('dashboard.newBooking')}>
            <Plus size={24} />
          </button>
        )
      )}

      {/* The chat surface only exists in support mode. */}
      {mode === 'support' && open && (
        <>
          {isMobile && <div className={s.scrim} onClick={closeChat} />}
          <div className={isMobile ? s.mobileWrap : s.webWrap}>
            <SupportPanel onClose={closeChat} mobile={isMobile} />
          </div>
        </>
      )}
    </>
  )
}
