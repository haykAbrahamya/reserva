import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Archive,
  ArrowLeft,
  Briefcase,
  CalendarClock,
  Clock,
  MapPin,
  Pause,
  Pencil,
  Phone,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { Badge, Button, ConfirmDialog, Empty, useToast } from '@/components/ui'
import { useResource } from '@/store/useResource'
import {
  specialtiesService,
  vacanciesService,
  type Vacancy,
  type VacancyAction,
  type VacancyInput,
} from '@/services/vacancies.service'
import { partnersService } from '@/services/partners.service'
import { errorMessage } from '@/utils/errors'
import { useI18n } from '@/i18n'
import { useLocalized } from '@/i18n/useLocalized'
import { ApplicantList } from './components/ApplicantList'
import { VacancyEditorModal } from './components/VacancyEditorModal'
import { daysUntil, payLabel, statusVariant } from './lib/vacancyDisplay'
import s from './VacancyDetail.module.scss'

/** Renew nags only once the end is actually near — same threshold as the card. */
const EXPIRY_WARN_DAYS = 7

/**
 * One listing, in full.
 *
 * The card can only ever show a listing's headline: a Vacancy carries a pay
 * model with four shapes, a schedule, an experience bar, a seat count, up to
 * thirteen perks, a description, an apply mode and a lifecycle — and a grid
 * that tried to render all of that would stop being scannable, which is the one
 * job a grid has.
 *
 * So the card stays a summary and this page is the record. It is also where the
 * APPLICANTS live: reading them is the main thing a partner comes back to a
 * published listing to do, and they were previously behind a drawer that had to
 * restate which listing you were looking at. Here the listing is already the
 * page around them.
 *
 * The lifecycle actions live here as well as on the card, deliberately. Someone
 * who has just read the whole listing is exactly the person deciding whether to
 * publish, renew or close it, and sending them back to the grid to do it would
 * be asking them to find it again.
 */
export function VacancyDetail() {
  const { id = '' } = useParams()
  const { t, tp, locale } = useI18n()
  const loc = useLocalized()
  const navigate = useNavigate()
  const toast = useToast()

  const {
    data: vacancy,
    loading,
    error,
    reload,
  } = useResource(() => vacanciesService.get(id), [id])

  /* The editor needs both catalogs. Loaded here rather than handed down from
     the list, because this page is reachable directly — from a notification,
     or from a bookmark — and must stand on its own. */
  const { data: groups } = useResource(() => specialtiesService.catalog(), [], [])
  const { data: locations } = useResource(() => partnersService.listLocations(), [], [])

  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const act = useCallback(
    async (action: VacancyAction) => {
      setBusy(true)
      try {
        await vacanciesService.act(id, action)
        toast(t(`vacancies.toast.${action}`))
        reload()
      } catch (err) {
        toast(errorMessage(err, t))
      } finally {
        setBusy(false)
      }
    },
    [id, reload, t, toast],
  )

  const save = async (input: VacancyInput) => {
    await vacanciesService.update(id, input)
    setEditing(false)
    toast(t('vacancies.toast.saved'))
    reload()
  }

  const remove = async () => {
    setBusy(true)
    try {
      await vacanciesService.remove(id)
      toast(t('vacancies.toast.deleted'))
      // Back to the list — the thing just read no longer exists.
      navigate('/vacancies', { replace: true })
    } catch (err) {
      toast(errorMessage(err, t))
      setBusy(false)
    }
  }

  if (loading && !vacancy) return <div className={s.skeleton} />

  if (error || !vacancy) {
    return (
      <div className={s.page}>
        <Empty
          icon={Briefcase}
          title={t('vacancies.detail.notFoundTitle')}
          description={t('vacancies.detail.notFoundBody')}
          action={
            <Link to="/vacancies">
              <Button variant="accent">{t('vacancies.detail.backToAll')}</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const v: Vacancy = vacancy
  const status = v.effectiveStatus
  const role = v.title.trim() || loc(v.specialty.roleName, v.specialty.roleNameI18n)
  const craft = loc(v.specialty.name, v.specialty.nameI18n)
  const left = daysUntil(v.expiresAt)
  const expiringSoon = status === 'published' && left != null && left <= EXPIRY_WARN_DAYS

  /* The lifecycle verbs that make sense from where this listing currently is.
     Offering "pause" on a draft is an option that does nothing. */
  const actions: { action: VacancyAction; icon: typeof Play; accent?: boolean }[] = [
    ...(status !== 'published' ? [{ action: 'publish' as const, icon: Play, accent: true }] : []),
    ...(status === 'published' ? [{ action: 'pause' as const, icon: Pause }] : []),
    ...(status === 'published' || status === 'expired'
      ? [{ action: 'renew' as const, icon: RefreshCw, accent: status === 'expired' || expiringSoon }]
      : []),
    ...(status !== 'closed' ? [{ action: 'close' as const, icon: Archive }] : []),
  ]

  /** The facts a partner checks at a glance, each with its own tile. */
  const facts = [
    {
      icon: CalendarClock,
      label: t('vacancies.detail.schedule'),
      value: v.scheduleType ? t(`vacancies.schedule.${v.scheduleType}`) : t('common.dash'),
      note: v.scheduleNote.trim() || null,
    },
    {
      icon: Sparkles,
      label: t('vacancies.detail.experience'),
      value: t(`vacancies.experience.${v.experience}`),
      note: null,
    },
    {
      icon: Users,
      label: t('vacancies.detail.seats'),
      value: tp('vacancies.seats', v.seats, { count: v.seats }),
      note: null,
    },
    {
      icon: Clock,
      label: t('vacancies.detail.lifecycle'),
      value:
        status === 'published' && left != null
          ? tp('vacancies.expiresIn', left, { count: left })
          : t(`vacancies.statusNote.${status}`),
      note: null,
      warn: expiringSoon,
    },
  ]

  return (
    <div className={s.page}>
      <Link className={s.back} to="/vacancies">
        <ArrowLeft size={15} />
        {t('vacancies.detail.backToAll')}
      </Link>

      <header className={[s.hero, s[`status_${status}`]].filter(Boolean).join(' ')}>
        <div className={s.heroMain}>
          <div className={s.heroTop}>
            <Badge variant={statusVariant(status)} label={t(`vacancies.status.${status}`)} />
            <span className={s.craft}>{craft}</span>
            <span className={s.dot} />
            <span className={s.branch}>
              <MapPin size={12} />
              {v.location.name}
            </span>
          </div>

          <h1 className={s.title}>{role}</h1>

          {/* The money, at the size it deserves — it is the first thing both
              sides of this market look for. */}
          <p className={s.pay}>{payLabel(v, t, locale)}</p>
        </div>

        <div className={s.heroActions}>
          <Button onClick={() => setEditing(true)} disabled={busy}>
            <Pencil size={14} />
            {t('common.edit')}
          </Button>
          {actions.map(({ action, icon: Icon, accent }) => (
            <Button
              key={action}
              variant={accent ? 'accent' : undefined}
              onClick={() => void act(action)}
              disabled={busy}
            >
              <Icon size={14} />
              {t(`vacancies.actions.${action}`)}
            </Button>
          ))}
        </div>
      </header>

      <div className={s.facts}>
        {facts.map((f) => (
          <div key={f.label} className={s.fact}>
            <span className={s.factIcon}>
              <f.icon size={16} />
            </span>
            <div className={s.factText}>
              <span className={s.factLabel}>{f.label}</span>
              <span className={[s.factValue, f.warn ? s.factWarn : ''].filter(Boolean).join(' ')}>
                {f.value}
              </span>
              {f.note && <span className={s.factNote}>{f.note}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className={s.columns}>
        <div className={s.col}>
          <section className={s.panel}>
            <h2 className={s.panelTitle}>{t('vacancies.detail.description')}</h2>
            {v.description.trim() ? (
              <p className={s.description}>{v.description}</p>
            ) : (
              <p className={s.missing}>{t('vacancies.detail.noDescription')}</p>
            )}
          </section>

          <section className={s.panel}>
            <h2 className={s.panelTitle}>{t('vacancies.detail.conditions')}</h2>
            {v.perks.length > 0 ? (
              /* Every perk, not the card's two. This is the page you open to
                 find out exactly what was advertised. */
              <div className={s.perks}>
                {v.perks.map((p) => (
                  <span key={p} className={s.perk}>
                    {t(`vacancies.perks.${p}`)}
                  </span>
                ))}
              </div>
            ) : (
              <p className={s.missing}>{t('vacancies.detail.noPerks')}</p>
            )}
          </section>

          <section className={s.panel}>
            <h2 className={s.panelTitle}>{t('vacancies.detail.howToApply')}</h2>
            <p className={s.applyMode}>{t(`vacancies.applyMode.${v.applyMode}`)}</p>
            {v.applyMode !== 'in_app' && v.contactPhone && (
              <a className={s.contact} href={`tel:${v.contactPhone}`}>
                <Phone size={14} />
                {v.contactPhone}
              </a>
            )}
          </section>
        </div>

        {/*
          Applicants, beside the listing rather than behind a drawer.
          This is what a partner returns to a published listing FOR, so it gets
          a column of its own and keeps the terms visible next to it.
        */}
        <div className={s.col}>
          <section className={[s.panel, s.applicantsPanel].join(' ')}>
            <h2 className={s.panelTitle}>{t('vacancies.applicants.title')}</h2>
            {status === 'draft' ? (
              /* A draft has never been visible to anyone, so an empty list here
                 would read as "nobody wants this" rather than "nobody has seen
                 it". */
              <p className={s.missing}>{t('vacancies.detail.draftNoApplicants')}</p>
            ) : (
              <ApplicantList vacancyId={v.id} />
            )}
          </section>
        </div>
      </div>

      <div className={s.dangerRow}>
        <button type="button" className={s.deleteBtn} onClick={() => setConfirmDel(true)} disabled={busy}>
          <Trash2 size={14} />
          {t('vacancies.detail.delete')}
        </button>
      </div>

      <VacancyEditorModal
        open={editing}
        editing={v}
        groups={groups}
        locations={locations}
        saving={busy}
        onClose={() => setEditing(false)}
        onSave={save}
      />

      <ConfirmDialog
        open={confirmDel}
        title={t('vacancies.deleteTitle')}
        message={t('vacancies.deleteMessage')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={() => void remove()}
        onClose={() => setConfirmDel(false)}
      />
    </div>
  )
}
