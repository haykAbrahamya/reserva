import { useMemo, useState } from 'react'
import { MapPin, Plus, Search, Pencil, Trash2, CornerDownRight } from 'lucide-react'
import { Badge, Button, Input, Empty, ConfirmDialog, useToast } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { areasService, type Area, type AreaInput } from '@/services/areas.service'
import { errorMessage } from '@/services/errors'
import { AreaEditorModal } from './AreaEditorModal'
import s from './Areas.module.scss'

/**
 * The shared area catalog, as platform staff manage it.
 *
 * Rendered as the tree it is — a top-level place with its children indented
 * under it — because the parent is the thing that makes a row meaningful:
 * "Arabkir" only means something under "Yerevan", and there is an "Arabkir
 * Branch" in Vanadzor to prove it.
 *
 * Each row leads with what makes it safe to touch: how many branches sit in it,
 * and how many children it has. An area in use cannot be deleted — it is
 * deactivated, which removes it from pickers while existing branches keep
 * working.
 */
export function Areas() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Area | null>(null)
  const [confirmDel, setConfirmDel] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  const { data: areas, loading, reload } = useResource(() => areasService.list(), [], [])

  // Filtered locally: ~60 rows, so a round trip per keystroke would be slower
  // and worse than doing it here. Aliases are searched too, which is the point
  // of having them.
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return null
    return new Set(
      areas
        .filter((a) =>
          [a.key, a.name, a.nameI18n?.hy, a.nameI18n?.ru, ...(a.aliases ?? [])].some((v) =>
            (v ?? '').toLowerCase().includes(q),
          ),
        )
        .map((a) => a.key),
    )
  }, [areas, search])

  /**
   * Group into top-level nodes with their children. When searching, a parent is
   * kept if it OR any child matches — otherwise a hit on "Davtashen" would
   * appear with no indication that it is in Yerevan.
   */
  const tree = useMemo(() => {
    const roots = areas.filter((a) => !a.parentKey)
    const childrenOf = new Map<string, Area[]>()
    for (const a of areas) {
      if (!a.parentKey) continue
      const list = childrenOf.get(a.parentKey) ?? []
      list.push(a)
      childrenOf.set(a.parentKey, list)
    }
    return roots
      .map((root) => {
        const children = childrenOf.get(root.key) ?? []
        if (!matches) return { root, children }
        const keptChildren = children.filter((c) => matches.has(c.key))
        const rootMatches = matches.has(root.key)
        if (!rootMatches && keptChildren.length === 0) return null
        // A matching parent shows all its children, so the context is intact.
        return { root, children: rootMatches ? children : keptChildren }
      })
      .filter((n): n is { root: Area; children: Area[] } => n !== null)
  }, [areas, matches])

  const save = async (input: AreaInput, key: string) => {
    setSaving(true)
    try {
      if (editing) await areasService.update(key, input)
      else await areasService.create({ ...input, key })
      await reload()
      setEditorOpen(false)
      setEditing(null)
      toast(editing ? 'Area updated' : 'Area created')
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!confirmDel) return
    try {
      await areasService.remove(confirmDel.key)
      await reload()
      toast('Area removed')
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setConfirmDel(null)
    }
  }

  const openNew = () => { setEditing(null); setEditorOpen(true) }
  const openEdit = (a: Area) => { setEditing(a); setEditorOpen(true) }

  const totals = useMemo(() => {
    const withArea = areas.reduce((n, a) => n + a.usageCount, 0)
    const incomplete = areas.filter(
      (a) => !a.nameI18n?.hy?.trim() || !a.nameI18n?.ru?.trim(),
    ).length
    return { withArea, incomplete }
  }, [areas])

  const row = (a: Area, child: boolean) => (
    <div
      key={a.key}
      className={[s.row, child ? s.rowChild : '', a.active ? '' : s.rowOff].filter(Boolean).join(' ')}
    >
      <div className={s.cellMain} data-label="Area">
        <div className={s.rowName}>
          {child && <CornerDownRight size={13} className={s.childIcon} />}
          {a.name}
          {!a.active && <Badge variant="inactive" label="Hidden" />}
        </div>
        <div className={s.rowNative}>{a.nameI18n?.hy} · {a.nameI18n?.ru}</div>
      </div>

      <div className={s.cell} data-label="Kind">
        <span className={s.kind}>{a.kind}</span>
      </div>

      <div className={s.cell} data-label="Key">
        <code className={s.key}>{a.key}</code>
      </div>

      <div className={s.cell} data-label="Aliases">
        <span className={s.muted}>
          {a.aliases.length ? `${a.aliases.length} alias${a.aliases.length === 1 ? '' : 'es'}` : '—'}
        </span>
      </div>

      <div className={s.cell} data-label="Branches">
        <span className={a.usageCount > 0 ? s.usageOn : s.muted}>{a.usageCount}</span>
      </div>

      <div className={s.rowActions}>
        <button className={s.iconBtn} onClick={() => openEdit(a)} aria-label={`Edit ${a.name}`}>
          <Pencil size={14} />
        </button>
        <button
          className={[s.iconBtn, s.danger].join(' ')}
          onClick={() => setConfirmDel(a)}
          // The server refuses too; disabling here explains why instead of
          // making staff discover it through an error.
          disabled={a.usageCount > 0 || a.childCount > 0}
          title={
            a.childCount > 0 ? 'Has child areas — move them first'
              : a.usageCount > 0 ? 'Branches are in this area — deactivate it instead'
                : undefined
          }
          aria-label={`Delete ${a.name}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Areas</h1>
          <p className={s.sub}>
            Cities and districts branches are tagged with — {areas.length} places,
            {' '}{totals.withArea} branches placed
            {totals.incomplete > 0 && (
              <span className={s.warnNote}> · {totals.incomplete} missing a translation</span>
            )}
          </p>
        </div>
        <Button variant="accent" onClick={openNew}>
          <Plus size={14} /> New area
        </Button>
      </div>

      <div className={s.searchWrap}>
        <Search size={14} className={s.searchIcon} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search names, keys or aliases…"
          className={s.searchInput}
        />
      </div>

      {!loading && tree.length === 0 ? (
        <Empty
          icon={MapPin}
          title={search ? 'Nothing matches' : 'No areas yet'}
          description={search ? 'Try a different word — aliases are searched too.' : undefined}
        />
      ) : (
        <div className={s.groups}>
          {tree.map(({ root, children }) => (
            <section key={root.key} className={s.group}>
              <header className={s.groupHead}>
                <div className={s.groupTitle}>
                  {root.name}
                  <span className={s.groupNative}>{root.nameI18n?.hy} · {root.nameI18n?.ru}</span>
                </div>
                <span className={s.groupCount}>
                  {children.length ? `${children.length} inside` : root.kind}
                </span>
              </header>
              <div className={s.table}>
                {row(root, false)}
                {children.map((c) => row(c, true))}
              </div>
            </section>
          ))}
        </div>
      )}

      <AreaEditorModal
        open={editorOpen}
        editing={editing}
        areas={areas}
        saving={saving}
        onClose={() => { setEditorOpen(false); setEditing(null) }}
        onSave={save}
      />

      <ConfirmDialog
        open={!!confirmDel}
        title="Delete this area?"
        message={`“${confirmDel?.name ?? ''}” will be removed from the catalog. This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={del}
        onClose={() => setConfirmDel(null)}
      />
    </div>
  )
}
