import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Target, Plus, Search, Phone, Mail, Instagram, MessageSquare, MessageCircle, Pencil, Trash2, ArrowUpRight,
} from 'lucide-react'
import { Button, ConfirmDialog, Empty, Pagination, SegmentedFilter, Select, useToast } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { leadsService, type Lead, type LeadSource, type LeadStatus } from '@/services/leads.service'
import { errorMessage } from '@/services/errors'
import { TOOL_LABELS, labelFrom } from '../Analytics/catalog'
import { LeadModal } from './LeadModal'
import { SOURCE_META, STATUS_LABELS, STATUS_OPTIONS } from './leadLabels'
import s from './Leads.module.scss'

type StatusFilter = 'all' | LeadStatus
type SourceFilter = 'all' | LeadSource

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All sources' },
  ...(Object.keys(SOURCE_META) as LeadSource[]).map((value) => ({ value, label: SOURCE_META[value].label })),
]

function fmtWhen(iso: string): string {
  const d = new Date(iso)
  const min = Math.floor((Date.now() - d.getTime()) / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initials(text: string): string {
  const words = text.replace(/[@+]/g, ' ').trim().split(/\s+/).filter((w) => /\p{L}/u.test(w))
  return words.slice(0, 2).map((w) => [...w][0]?.toUpperCase() ?? '').join('') || '·'
}

/** What a lead is called on its card: a name, else the salon, else however they can be reached. */
function titleOf(l: Lead): { title: string; fromContact: boolean } {
  const named = l.name ?? l.company
  if (named) return { title: named, fromContact: false }
  if (l.contact) return { title: l.contact, fromContact: true }
  return { title: (l.instagram ? `@${l.instagram}` : null) ?? l.phone ?? l.email ?? 'Lead', fromContact: false }
}

/**
 * Leads: potential partners in one work list — everyone who filled in the
 * sign-up form, asked for a demo, or made something on the tools with a
 * contact line on it, plus anyone added by hand. Each card says how to reach
 * them and where they came from; the status says where we stand.
 */
export function Leads() {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [source, setSource] = useState<SourceFilter>('all')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [editing, setEditing] = useState<Lead | null>(null)
  const [adding, setAdding] = useState(false)
  const [confirmDel, setConfirmDel] = useState<Lead | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => { setDebounced(search.trim()); setPage(1) }, 300)
    return () => clearTimeout(id)
  }, [search])

  const { data: result, reload } = useResource(
    () => leadsService.list({
      page,
      pageSize,
      status: status === 'all' ? undefined : status,
      source: source === 'all' ? undefined : source,
      search: debounced || undefined,
    }),
    [page, pageSize, status, source, debounced],
  )

  const items = result?.items ?? []
  const total = result?.total ?? 0
  const counts = result?.counts
  const pageCount = result?.pageCount ?? 1
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const everyone = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined
  const filtered = status !== 'all' || source !== 'all' || !!debounced

  const changeStatus = (f: StatusFilter) => { setStatus(f); setPage(1) }
  const changeSource = (f: string) => { setSource(f as SourceFilter); setPage(1) }

  const move = async (lead: Lead, next: LeadStatus) => {
    if (next === lead.status) return
    try {
      await leadsService.update(lead.id, { status: next })
      toast(`Moved to “${STATUS_LABELS[next]}”`)
      await reload()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  const confirmDelete = async () => {
    if (!confirmDel) return
    setDeleting(true)
    try {
      await leadsService.remove(confirmDel.id)
      toast('Lead deleted')
      setConfirmDel(null)
      await reload()
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Leads</h1>
          <p className={s.sub}>Potential partners: sign-ups, demo requests and tools users with a contact — and anyone you add.</p>
        </div>
        <Button variant="accent" onClick={() => setAdding(true)}>
          <Plus size={14} /> Add lead
        </Button>
      </div>

      <div className={s.filters}>
        <SegmentedFilter<StatusFilter>
          ariaLabel="Filter leads by status"
          value={status}
          onChange={changeStatus}
          options={[
            { value: 'all', label: 'All', count: everyone },
            ...STATUS_OPTIONS.map((o) => ({ ...o, count: counts?.[o.value] })),
          ]}
        />
        <div className={s.filterRow}>
          <div className={s.searchWrap}>
            <Search size={15} className={s.searchIcon} />
            <input
              className={s.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, Instagram, notes…"
            />
          </div>
          <Select value={source} onChange={changeSource} options={SOURCE_OPTIONS} className={s.sourceSelect} />
        </div>
      </div>

      {total === 0 ? (
        <Empty
          icon={Target}
          title={filtered ? 'No leads here' : 'No leads yet'}
          description={
            filtered
              ? 'Nothing matches this view.'
              : 'Sign-ups, demo requests and tools users who leave a contact appear here by themselves.'
          }
          action={!filtered ? <Button variant="accent" onClick={() => setAdding(true)}><Plus size={14} /> Add lead</Button> : undefined}
        />
      ) : (
        <>
          <div className={s.list}>
            {items.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onMove={(next) => move(lead, next)}
                onEdit={() => setEditing(lead)}
                onDelete={() => setConfirmDel(lead)}
              />
            ))}
          </div>

          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(n) => { setPageSize(n); setPage(1) }}
            pageSizeLabel="Per page"
            summary={`Showing ${from}–${to} of ${total}`}
          />
        </>
      )}

      <LeadModal
        open={adding || !!editing}
        lead={editing}
        onClose={() => { setAdding(false); setEditing(null) }}
        onSaved={async () => {
          toast(editing ? 'Lead saved' : 'Lead added')
          setAdding(false)
          setEditing(null)
          await reload()
        }}
      />

      <ConfirmDialog
        open={!!confirmDel}
        variant="danger"
        title="Delete lead"
        message={`Delete “${confirmDel ? titleOf(confirmDel).title : ''}” and its notes? This can't be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => { if (!deleting) setConfirmDel(null) }}
      />
    </div>
  )
}

function LeadCard({ lead, onMove, onEdit, onDelete }: {
  lead: Lead
  onMove: (next: LeadStatus) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { title, fromContact } = titleOf(lead)
  const subtitle = lead.name && lead.company ? lead.company : null
  const Source = SOURCE_META[lead.source]

  return (
    <div className={[s.card, s[`status_${lead.status}`]].filter(Boolean).join(' ')}>
      <div className={s.avatar} aria-hidden="true">{initials(title)}</div>

      <div className={s.cardMain}>
        <div className={s.cardTop}>
          <span className={s.name}>{title}</span>
          {subtitle && <span className={s.company}>· {subtitle}</span>}
          <span className={s.source}><Source.icon size={12} /> {Source.label}</span>
        </div>

        <div className={s.contacts}>
          {lead.phone && <a className={s.contact} href={`tel:${lead.phone}`}><Phone size={13} /> {lead.phone}</a>}
          {lead.email && <a className={s.contact} href={`mailto:${lead.email}`}><Mail size={13} /> {lead.email}</a>}
          {lead.instagram && (
            <a className={s.contact} href={`https://www.instagram.com/${lead.instagram}/`} target="_blank" rel="noopener noreferrer">
              <Instagram size={13} /> @{lead.instagram}
            </a>
          )}
          {lead.contact && !fromContact && <span className={s.contact}><MessageCircle size={13} /> {lead.contact}</span>}
          <span className={s.when} title={new Date(lead.lastActivityAt).toLocaleString('en-GB')}>{fmtWhen(lead.lastActivityAt)}</span>
        </div>

        <Origin lead={lead} />

        {lead.notes && (
          <div className={s.notes}>
            <MessageSquare size={13} className={s.notesIcon} />
            <span>{lead.notes}</span>
          </div>
        )}
      </div>

      <div className={s.cardActions}>
        <Select
          size="sm"
          value={lead.status}
          onChange={(v) => onMove(v as LeadStatus)}
          options={STATUS_OPTIONS}
          className={s.statusSelect}
          panelMinWidth={170}
        />
        <button className={s.iconBtn} title="Edit" aria-label="Edit lead" onClick={onEdit}><Pencil size={15} /></button>
        <button className={s.iconDelete} title="Delete" aria-label="Delete lead" onClick={onDelete}><Trash2 size={15} /></button>
      </div>
    </div>
  )
}

/** Where the lead came from, and the way back to it: the visit, the registration, the partner. */
function Origin({ lead }: { lead: Lead }) {
  const parts: ReactNode[] = []
  if (lead.source === 'tools' && lead.tools.length) {
    parts.push(<span key="made">Made: {lead.tools.map((t) => labelFrom(TOOL_LABELS, t)).join(' · ')}</span>)
  }
  if (lead.context) parts.push(<span key="ctx" className={lead.source === 'demo' ? s.quote : undefined}>{lead.context}</span>)
  if (lead.partnerId) {
    parts.push(<Link key="partner" className={s.originLink} to={`/partners/${lead.partnerId}`}>Open partner <ArrowUpRight size={12} /></Link>)
  } else if (lead.source === 'signup') {
    parts.push(<Link key="pending" className={s.originLink} to="/pending-registrations">Pending registration <ArrowUpRight size={12} /></Link>)
  } else if (lead.source === 'demo') {
    parts.push(<Link key="demo" className={s.originLink} to="/demo-requests">Demo request <ArrowUpRight size={12} /></Link>)
  }
  if (lead.source === 'tools' && lead.sessionId) {
    parts.push(
      <Link key="visit" className={s.originLink} to={`/analytics?site=tools&tab=sessions&session=${lead.sessionId}`}>
        Their visit <ArrowUpRight size={12} />
      </Link>,
    )
  }
  if (!parts.length) return null
  return <div className={s.origin}>{parts}</div>
}
