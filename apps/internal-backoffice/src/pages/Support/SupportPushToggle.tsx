import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import {
  pushSupported,
  notificationPermission,
  isSubscribed,
  enablePush,
  disablePush,
} from '@/services/push.service'
import s from './Support.module.scss'

/**
 * Enable/disable browser push for support alerts (this device). When on, the
 * staffer gets a notification for every new partner message even with the
 * console closed. Backed by the platform push endpoints.
 */
export function SupportPushToggle() {
  const toast = useToast()
  const [supported] = useState(pushSupported())
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { isSubscribed().then(setOn).catch(() => undefined) }, [])

  if (!supported) return null

  const toggle = async () => {
    setBusy(true)
    try {
      if (on) {
        await disablePush()
        setOn(false)
        toast('Support notifications off')
      } else {
        const ok = await enablePush()
        setOn(ok)
        toast(ok
          ? 'Support notifications on'
          : notificationPermission() === 'denied'
            ? 'Notifications are blocked in your browser settings'
            : 'Could not enable notifications')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant={on ? 'accent' : 'ghost'} size="sm" onClick={toggle} disabled={busy}>
      {busy ? <Loader2 size={14} className={s.spin} /> : on ? <Bell size={14} /> : <BellOff size={14} />}
      {on ? 'Notifications on' : 'Enable notifications'}
    </Button>
  )
}
