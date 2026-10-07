import { Fragment } from 'react'
import { ArrowLeft, ChevronRight, Footprints, History, Languages, LogIn, MapPin, Store } from 'lucide-react'
import { Button, Empty } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { ApiError } from '@/services/http'
import { analyticsService, type SessionEvent } from '@/services/analytics.service'
import { ErrorState, Panel, PanelEmpty, Skeleton, StaffTag } from './parts'
import { TRAFFIC_CHANNEL_LABELS, labelFrom } from './catalog'
import { ChannelIcon, DeviceIcon } from './icons'
import { EventIcon, describeEvent } from './journey'
import { OutcomeBadge } from './SessionsTab'
import { VisitorTag, ordinal, visitNumber } from './visitor'
import {
  countryName, deviceLabel, fmtDuration, fmtEventTime, fmtEventTimeFull, fmtInt, languageName,
} from './format'
import s from './Analytics.module.scss'

/** A pause this long between two steps gets its own "… later" line. */
const GAP_MS = 2 * 60_000

function fmtGap(ms: number): string {
  const min = Math.round(ms / 60_000)
  if (min < 60) return `${min} min later`
  const h = Math.floor(min / 60)
  return `${h} h ${min % 60} min later`
}

/**
 * One visit as a story (contract §11): who (anonymously), from where, on what,
 * and every step in order as a plain sentence, with how far into the visit it
 * happened. Deep-linkable: `?tab=sessions&session=<id>`.
 */
export function SessionView({ sessionId, backLabel, onBack, onOpenSession }: {
  sessionId: string
  backLabel: string
  onBack: () => void
  onOpenSession: (id: string) => void
}) {
  const { data, loading, error, reload } = useResource(() => analyticsService.session(sessionId), [sessionId])

  const back = (
    <button type="button" className={s.backLink} onClick={onBack}>
      <ArrowLeft size={14} /> {backLabel}
    </button>
  )

  if (error && !loading) {
    // The server's own 404 means this visit is gone (deleted with old data, or
    // a mistyped link); a missing ROUTE is the API not being deployed yet.
    const gone = error instanceof ApiError && error.status === 404 && !/^Cannot (GET|get)/.test(error.message)
    return (
      <div className={s.tab}>
        {back}
        {gone ? (
          <div className={s.emptyCard}>
            <Empty
              icon={Footprints}
              title="This visit isn’t there anymore"
              description="It may have been deleted along with older analytics data, or the link is incomplete."
              action={<Button size="sm" onClick={onBack}><ArrowLeft size={13} /> {backLabel}</Button>}
            />
          </div>
        ) : (
          <ErrorState error={error} onRetry={() => void reload()} />
        )}
      </div>
    )
  }

  if (!data) {
    return (
      <div className={s.tab} aria-busy="true">
        {back}
        <Skeleton height={150} />
        <div className={s.sessionGrid}>
          <Skeleton height={460} />
          <Skeleton height={260} />
        </div>
      </div>
    )
  }

  const { session, events, labels, otherSessions } = data
  const nth = visitNumber(session, otherSessions)
  const visitText = session.visitorSessions <= 1 || nth === 1 ? 'first visit'
    : nth ? `${ordinal(nth)} visit`
      : `${fmtInt(session.visitorSessions)} visits`
  const place = [session.city, session.country ? countryName(session.country) : null].filter(Boolean).join(', ')
  const landing = session.landingHost || session.landingPath
    ? `${session.landingHost ?? ''}${session.landingPath ?? ''}`
    : null

  // Offsets come from the visitor's clock when every step has one: the server
  // receives steps in batches, so its own times bunch together. Legacy visits
  // carry server times only.
  const deviceClock = events.length > 0 && events.every((e) => e.clientAt)
  const time = (e: SessionEvent) => Date.parse(deviceClock && e.clientAt ? e.clientAt : e.at)
  const t0 = events.length ? time(events[0]) : 0

  return (
    <div className={[s.tab, loading ? s.stale : s.fresh].join(' ')} aria-busy={loading}>
      {back}

      <section className={s.svHead}>
        <div className={s.svTitleRow}>
          <h2 className={s.svTitle}>
            <VisitorTag visitorId={session.visitorId} prefix="Visitor" />
            <span className={s.svTitleSep}>·</span>
            <span>{visitText}</span>
          </h2>
          <span className={s.svBadges}>
            {session.isInternal && <StaffTag />}
            <OutcomeBadge row={session} />
          </span>
        </div>
        <p className={s.svMeta}>
          {fmtEventTimeFull(session.startedAt)}
          {' · '}{fmtInt(session.eventCount)} {session.eventCount === 1 ? 'step' : 'steps'}
          {session.eventCount > 1 && <>{' · '}{fmtDuration(session.durationSec)} long</>}
        </p>

        <dl className={s.svFacts}>
          <div className={s.svFact}>
            <dt>Source</dt>
            <dd>
              <span className={s.iconText}>
                <ChannelIcon channel={session.channel} size={13} />
                {labelFrom(TRAFFIC_CHANNEL_LABELS, session.channel)}
              </span>
              {session.utmCampaign && <span className={s.svFactSub}>campaign {session.utmCampaign}</span>}
              {session.referrerHost && <span className={s.svFactSub}>via {session.referrerHost}</span>}
            </dd>
          </div>
          <div className={s.svFact}>
            <dt>Device</dt>
            <dd>
              <span className={s.iconText}>
                <DeviceIcon type={session.deviceType} size={13} />
                {deviceLabel(session.deviceType)}
              </span>
              {(session.os || session.browser) && (
                <span className={s.svFactSub}>{[session.os, session.browser].filter(Boolean).join(' · ')}</span>
              )}
            </dd>
          </div>
          <div className={s.svFact}>
            <dt>Place</dt>
            <dd><span className={s.iconText}><MapPin size={13} />{place || 'Unknown'}</span></dd>
          </div>
          <div className={s.svFact}>
            <dt>Language</dt>
            <dd>
              <span className={s.iconText}>
                <Languages size={13} />
                {session.language ? languageName(session.language) : 'Unknown'}
              </span>
              {session.language && <span className={s.svFactSub}>{session.language}</span>}
            </dd>
          </div>
          <div className={s.svFact}>
            <dt>Landing page</dt>
            <dd>
              <span className={s.iconText}><LogIn size={13} /><span className={s.svMono}>{landing ?? '—'}</span></span>
            </dd>
          </div>
          {session.partners.length > 0 && (
            <div className={s.svFact}>
              <dt>Partners</dt>
              <dd>
                <span className={s.iconText}><Store size={13} />{session.partners.map((p) => p.name).join(', ')}</span>
              </dd>
            </div>
          )}
        </dl>
      </section>

      <div className={s.sessionGrid}>
        <Panel
          title="Journey"
          sub={`Every step in order, timed from the first${deviceClock ? ' by the visitor’s clock' : ''}. Hover a time for the exact moment.`}
        >
          {events.length === 0 ? (
            <PanelEmpty icon={Footprints} title="No steps recorded">
              The steps of this visit were removed, or never reached the server.
            </PanelEmpty>
          ) : (
            <ol className={s.timeline}>
              {events.map((ev, i) => {
                const line = describeEvent(ev, {
                  labels,
                  partners: session.partners,
                  isLast: i === events.length - 1,
                })
                const gap = i > 0 ? time(ev) - time(events[i - 1]) : 0
                const offset = Math.max(0, (time(ev) - t0) / 1000)
                // Name the partner on a step when the visit spans several.
                const partnerHint = session.partners.length > 1 && ev.partner && ev.name !== 'page_view'
                  ? ev.partner.name
                  : null
                const exact = `${fmtEventTimeFull(ev.at)}${ev.clientAt && ev.clientAt !== ev.at
                  ? `\nVisitor’s clock: ${fmtEventTimeFull(ev.clientAt)}`
                  : ''}`
                return (
                  <Fragment key={ev.id}>
                    {gap >= GAP_MS && <li className={s.tlGap} aria-hidden="true">{fmtGap(gap)}</li>}
                    <li className={[s.tlItem, line.end ? s.tlEnd : ''].filter(Boolean).join(' ')} data-tone={line.tone}>
                      <span className={s.tlTime} title={exact}>+{fmtDuration(offset)}</span>
                      {/* Opaque disc under the tinted one, so the rail never shows through. */}
                      <span className={s.tlNode}>
                        <span className={`${s.tlNodeIn} ${s[`tone_${line.tone}`]}`}>
                          <EventIcon name={ev.name} props={ev.props} size={13} />
                        </span>
                      </span>
                      <span className={s.tlBody}>
                        <span className={s.tlText}>{line.text}</span>
                        {partnerHint && <span className={s.tlMeta}>{partnerHint}</span>}
                      </span>
                    </li>
                  </Fragment>
                )
              })}
            </ol>
          )}
        </Panel>

        <Panel
          title="Other visits by this person"
          sub={session.visitorSessions > 1
            ? `${fmtInt(session.visitorSessions)} visits in total${otherSessions.length >= 20 ? ' — the 20 most recent others below' : ''}.`
            : 'Same anonymous visitor, recognised by their browser.'}
          flush
        >
          {otherSessions.length === 0 ? (
            <PanelEmpty icon={History} title="No other visits">
              This is the only visit from this browser so far.
            </PanelEmpty>
          ) : (
            <ul className={s.otherList}>
              {otherSessions.map((o) => (
                <li key={o.id}>
                  <button type="button" className={s.otherRow} onClick={() => onOpenSession(o.id)} title="Open this visit">
                    <span className={s.otherWhen} title={fmtEventTimeFull(o.startedAt)}>{fmtEventTime(o.startedAt)}</span>
                    <span className={s.iconText}>
                      <ChannelIcon channel={o.channel} size={13} />
                      {labelFrom(TRAFFIC_CHANNEL_LABELS, o.channel)}
                    </span>
                    <span className={s.otherCount}>{fmtInt(o.eventCount)} {o.eventCount === 1 ? 'step' : 'steps'}</span>
                    {o.booked && (
                      <span className={`${s.evBadge} ${s.tone_success}`}><span className={s.evDot} />Booked</span>
                    )}
                    <ChevronRight size={14} className={s.otherGo} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
