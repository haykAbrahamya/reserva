import type { ReactNode } from 'react'
import {
  AppWindow, Clock, FileText, Fingerprint, Footprints, Hash, Languages, Link2, MapPin, Megaphone, Store, UserRound,
} from 'lucide-react'
import { Button, Drawer } from '@/components/ui'
import type { AnalyticsEventRow } from '@/services/analytics.service'
import { EventBadge, StaffTag } from './parts'
import { VisitorTag } from './visitor'
import {
  CONTACT_CHANNEL_LABELS, PAGE_TYPE_LABELS, PROP_LABELS, TRAFFIC_CHANNEL_LABELS, eventDef, humanize, labelFrom,
} from './catalog'
import { ChannelIcon, ContactIcon, DeviceIcon } from './icons'
import { countryName, deviceLabel, fmtEventTimeFull, fmtInt, isUuid, languageName } from './format'
import s from './Analytics.module.scss'

function Row({ icon, label, children }: { icon?: ReactNode; label: ReactNode; children: ReactNode }) {
  return (
    <div className={s.row}>
      <span className={s.rowIcon}>{icon}</span>
      <span className={s.rowLabel}>{label}</span>
      <span className={s.rowValue}>{children}</span>
    </div>
  )
}

/** Ids in mono (and whole on one click); known enums by name; anything
 *  structured as compact JSON so nothing is ever silently dropped. */
function PropValue({ name, value }: { name: string; value: unknown }) {
  if (isUuid(value)) return <span className={s.uuid}>{value}</span>
  if (name === 'ch' && typeof value === 'string') {
    return (
      <span className={s.iconText}>
        <ContactIcon channel={value} size={13} /> {labelFrom(CONTACT_CHANNEL_LABELS, value)}
      </span>
    )
  }
  if (name === 'pt' && typeof value === 'string') return <>{labelFrom(PAGE_TYPE_LABELS, value)}</>
  if (name === 'stars' && typeof value === 'number') return <>{value} ★</>
  if (typeof value === 'boolean') return <>{value ? 'Yes' : 'No'}</>
  if (typeof value === 'number') return <>{fmtInt(value)}</>
  if (typeof value === 'string') return <>{value || '—'}</>
  return <span className={s.uuid}>{JSON.stringify(value)}</span>
}

export function EventDrawer({ event, onClose, onOnlyEvent, onOnlyPartner, onOpenSession }: {
  event: AnalyticsEventRow | null
  onClose: () => void
  /** Narrow the table to this event's name. */
  onOnlyEvent: (name: string) => void
  /** Narrow the table to this event's partner. */
  onOnlyPartner: (partnerId: string) => void
  /** The whole visit this event belongs to, as a journey. */
  onOpenSession: (sessionId: string) => void
}) {
  const ev = event
  const partner = ev?.partner
  return (
    <Drawer
      open={!!ev}
      onClose={onClose}
      title={ev ? eventDef(ev.name).label : ''}
      subtitle={ev ? fmtEventTimeFull(ev.createdAt) : undefined}
      footer={ev && (
        <>
          <Button variant="ghost" size="sm" onClick={() => onOnlyEvent(ev.name)}>
            Only “{eventDef(ev.name).label}”
          </Button>
          {partner && (
            <Button variant="ghost" size="sm" onClick={() => onOnlyPartner(partner.id)}>
              Only {partner.name}
            </Button>
          )}
          <Button variant="accent" size="sm" onClick={() => onOpenSession(ev.session.id)}>
            <Footprints size={13} /> Open session
          </Button>
        </>
      )}
    >
      {ev && <EventDetail ev={ev} />}
    </Drawer>
  )
}

function EventDetail({ ev }: { ev: AnalyticsEventRow }) {
  const props = Object.entries(ev.props ?? {})
  const sess = ev.session
  const page = ev.host ? `${ev.host}${ev.path ?? ''}` : ev.path
  const place = [sess.city, sess.country ? countryName(sess.country) : null].filter(Boolean).join(', ')

  return (
    <>
      <div className={s.drawerHead}>
        <EventBadge name={ev.name} />
        <span className={s.code}>{ev.name}</span>
        {sess.isInternal && <StaffTag />}
        <span className={s.drawerWho}><VisitorTag visitorId={sess.visitorId} prefix="Visitor" /></span>
      </div>

      <section className={s.section}>
        <h3 className={s.sectionTitle}>Event</h3>
        <div className={s.rows}>
          <Row icon={<Clock size={14} />} label="Time">{fmtEventTimeFull(ev.createdAt)}</Row>
          <Row icon={<FileText size={14} />} label="Page">
            {page ? <span className={s.uuid}>{page}</span> : '—'}
          </Row>
          <Row icon={<Store size={14} />} label="Partner">
            {ev.partner ? (
              <>
                {ev.partner.name}
                {ev.partner.slug && <span className={s.rowKey}>{ev.partner.slug}</span>}
              </>
            ) : '—'}
          </Row>
          <Row icon={<Hash size={14} />} label="Event ID"><span className={s.uuid}>{ev.id}</span></Row>
        </div>
      </section>

      <section className={s.section}>
        <h3 className={s.sectionTitle}>Properties</h3>
        {props.length === 0 ? (
          <p className={s.noProps}>This event carries no properties.</p>
        ) : (
          <div className={s.rows}>
            {props.map(([key, value]) => (
              <Row
                key={key}
                label={<>{PROP_LABELS[key] ?? humanize(key)}<span className={s.rowKey}>{key}</span></>}
              >
                <PropValue name={key} value={value} />
              </Row>
            ))}
          </div>
        )}
      </section>

      <section className={s.section}>
        <h3 className={s.sectionTitle}>Session</h3>
        <div className={s.rows}>
          <Row icon={<ChannelIcon channel={sess.channel} size={14} />} label="Channel">
            {labelFrom(TRAFFIC_CHANNEL_LABELS, sess.channel)}
          </Row>
          <Row icon={<Link2 size={14} />} label="Referrer">
            {sess.referrerHost ? <span className={s.uuid}>{sess.referrerHost}</span> : 'None (direct)'}
          </Row>
          {sess.utmCampaign && (
            <Row icon={<Megaphone size={14} />} label="Campaign">{sess.utmCampaign}</Row>
          )}
          <Row icon={<DeviceIcon type={sess.deviceType} size={14} />} label="Device">{deviceLabel(sess.deviceType)}</Row>
          <Row icon={<AppWindow size={14} />} label="Browser · OS">
            {[sess.browser, sess.os].filter(Boolean).join(' · ') || '—'}
          </Row>
          <Row icon={<MapPin size={14} />} label="Location">{place || '—'}</Row>
          <Row icon={<Languages size={14} />} label="Language">
            {sess.language ? <>{languageName(sess.language)}<span className={s.rowKey}>{sess.language}</span></> : '—'}
          </Row>
          <Row icon={<UserRound size={14} />} label="Traffic">
            {sess.isInternal ? 'Staff (internal)' : 'Visitor'}
          </Row>
          <Row icon={<Fingerprint size={14} />} label="Visitor ID"><span className={s.uuid}>{sess.visitorId}</span></Row>
          <Row icon={<Hash size={14} />} label="Session ID"><span className={s.uuid}>{sess.id}</span></Row>
        </div>
      </section>
    </>
  )
}
