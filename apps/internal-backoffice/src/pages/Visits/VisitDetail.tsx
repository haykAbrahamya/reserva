import {
  Clock, MapPin, Globe, Smartphone, Tablet, Monitor, Chrome, AppWindow,
  Link2, Languages, Ruler, FileCode,
} from 'lucide-react'
import { Modal } from '@/components/ui'
import { type Visit } from '@/services/visits.service'
import { fmtIp, fmtGeo, fmtBrowser, fmtOs } from './format'
import s from './Visits.module.scss'

function DeviceIcon({ type }: { type: string | null }) {
  if (type === 'mobile') return <Smartphone size={15} />
  if (type === 'tablet') return <Tablet size={15} />
  return <Monitor size={15} />
}

interface Row {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}

export function VisitDetail({ visit, onClose }: { visit: Visit | null; onClose: () => void }) {
  const v = visit
  const screen = v?.screenW && v?.screenH ? `${v.screenW} × ${v.screenH}` : '—'

  const rows: Row[] = v
    ? [
        { icon: <Clock size={15} />, label: 'Time', value: new Date(v.createdAt).toLocaleString() },
        { icon: <MapPin size={15} />, label: 'Location', value: fmtGeo(v) },
        { icon: <Globe size={15} />, label: 'IP address', value: fmtIp(v.ip), mono: true },
        { icon: <DeviceIcon type={v.deviceType} />, label: 'Device', value: v.deviceType ?? '—' },
        { icon: <Chrome size={15} />, label: 'Browser', value: fmtBrowser(v) },
        { icon: <AppWindow size={15} />, label: 'OS', value: fmtOs(v) },
        { icon: <FileCode size={15} />, label: 'Page', value: v.host ? `${v.host}${v.path ?? ''}` : (v.path ?? '—'), mono: true },
        { icon: <Link2 size={15} />, label: 'Referrer', value: v.referrer || '— (direct)' },
        { icon: <Languages size={15} />, label: 'Language', value: v.language ?? '—' },
        { icon: <Ruler size={15} />, label: 'Screen', value: screen },
      ]
    : []

  return (
    <Modal open={!!v} onClose={onClose} title="Visit details" size="md">
      {v && (
        <div className={s.detailList}>
          {rows.map((r) => (
            <div key={r.label} className={s.detailRow}>
              <span className={s.detailIcon}>{r.icon}</span>
              <span className={s.detailLabel}>{r.label}</span>
              <span className={r.mono ? `${s.detailValue} ${s.mono}` : s.detailValue}>{r.value}</span>
            </div>
          ))}
          {v.userAgent && (
            <div className={s.uaBlock}>
              <span className={s.detailLabel}>User-Agent</span>
              <code className={s.ua}>{v.userAgent}</code>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
