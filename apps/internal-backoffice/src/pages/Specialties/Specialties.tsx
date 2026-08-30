import { useMemo, useState } from 'react'
import { Tags, Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { Badge, Button, Input, Empty, ConfirmDialog, useToast } from '@/components/ui'
import { useResource } from '@/store/useResource'
import {
  specialtiesService, type Specialty, type SpecialtyInput,
} from '@/services/specialties.service'
import { errorMessage } from '@/services/errors'
import { SpecialtyEditorModal } from './SpecialtyEditorModal'
import s from './Specialties.module.scss'

/**
 * The shared specialty vocabulary, as platform staff manage it.
 *
 * This is the single taxonomy every product reads, so the page leads with what
 * makes an entry safe to touch: which group it is in, and how many live
 * listings depend on it. An entry in use cannot be deleted — it is deactivated,
 * which removes it from pickers while existing rows keep rendering.
 */
export function Specialties() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Specialty | null>(null)
  const [confirmDel, setConfirmDel] = useState<Specialty | null>(null)
  const [saving, setSaving] = useState(false)

  const { data: groups, reload: reloadGroups } = useResource(() => specialtiesService.listGroups(), [], [])
  const { data: rows, loading, reload } = useResource(() => specialtiesService.list(), [], [])

  // Filtered locally: the whole catalog is ~50 rows, so a round trip per
  // keystroke would be slower and worse than doing it here.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.key, r.name, r.roleName, r.nameI18n?.hy, r.nameI18n?.ru, r.roleNameI18n?.hy, r.roleNameI18n?.ru, ...r.aliases]
        .some((v) => (v ?? '').toLowerCase().includes(q)),
    )
  }, [rows, search])

  const byGroup = useMemo(() => {
    const map = new Map<string, Specialty[]>()
    for (const r of filtered) {
      const list = map.get(r.groupKey) ?? []
      list.push(r)
      map.set(r.groupKey, list)
    }
    return map
  }, [filtered])

  const refresh = async () => { await Promise.all([reload(), reloadGroups()]) }

  const save = async (input: SpecialtyInput, key: string) => {
    setSaving(true)
    try {
      if (editing) await specialtiesService.update(key, input)
      else await specialtiesService.create({ ...input, key })
      await refresh()
      setEditorOpen(false)
      setEditing(null)
      toast(editing ? 'Specialty updated' : 'Specialty created')
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!confirmDel) return
    try {
      await specialtiesService.remove(confirmDel.key)
      await refresh()
      toast('Specialty removed')
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setConfirmDel(null)
    }
  }

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Specialties</h1>
          <p className={s.sub}>
            The shared vocabulary every product reads — {rows.length} entries across {groups.length} groups
          </p>
        </div>
        <Button
          variant="accent"
          onClick={() => { setEditing(null); setEditorOpen(true) }}
          disabled={groups.length === 0}
        >
          <Plus size={14} /> New specialty
        </Button>
      </div>

      <div className={s.searchWrap}>
        <Search size={14} className={s.searchIcon} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search names, roles or aliases…"
          className={s.searchInput}
        />
      </div>

      {!loading && filtered.length === 0 ? (
        <Empty
          icon={Tags}
          title={search ? 'Nothing matches' : 'No specialties yet'}
          description={search ? 'Try a different word — aliases are searched too.' : undefined}
        />
      ) : (
        <div className={s.groups}>
          {groups.map((g) => {
            const items = byGroup.get(g.key) ?? []
            if (items.length === 0) return null
            return (
              <section key={g.key} className={s.group}>
                <header className={s.groupHead}>
                  <div className={s.groupTitle}>
                    {g.name}
                    <span className={s.groupNative}>{g.nameI18n?.hy} · {g.nameI18n?.ru}</span>
                  </div>
                  <span className={s.groupCount}>{items.length}</span>
                </header>

                <div className={s.table}>
                  {items.map((r) => (
                    <div key={r.key} className={[s.row, r.active ? '' : s.rowOff].filter(Boolean).join(' ')}>
                      <div className={s.cellMain} data-label="Specialty">
                        <div className={s.rowName}>
                          {r.name}
                          {!r.active && <Badge variant="inactive" label="Hidden" />}
                        </div>
                        <div className={s.rowNative}>{r.nameI18n?.hy} · {r.nameI18n?.ru}</div>
                      </div>

                      <div className={s.cell} data-label="Role">
                        <div className={s.rowRole}>{r.roleName}</div>
                        <div className={s.rowNative}>{r.roleNameI18n?.hy} · {r.roleNameI18n?.ru}</div>
                      </div>

                      <div className={s.cell} data-label="Key">
                        <code className={s.key}>{r.key}</code>
                      </div>

                      <div className={s.cell} data-label="Aliases">
                        <span className={s.muted}>
                          {r.aliases.length ? `${r.aliases.length} alias${r.aliases.length === 1 ? '' : 'es'}` : '—'}
                        </span>
                      </div>

                      <div className={s.cell} data-label="In use">
                        <span className={r.usageCount > 0 ? s.usageOn : s.muted}>{r.usageCount}</span>
                      </div>

                      <div className={s.rowActions}>
                        <button
                          className={s.iconBtn}
                          onClick={() => { setEditing(r); setEditorOpen(true) }}
                          aria-label={`Edit ${r.name}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className={[s.iconBtn, s.danger].join(' ')}
                          onClick={() => setConfirmDel(r)}
                          // The server refuses too; disabling here explains why
                          // rather than making them discover it via an error.
                          disabled={r.usageCount > 0}
                          title={r.usageCount > 0 ? 'In use — deactivate it instead' : undefined}
                          aria-label={`Delete ${r.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <SpecialtyEditorModal
        open={editorOpen}
        editing={editing}
        groups={groups}
        saving={saving}
        onClose={() => { setEditorOpen(false); setEditing(null) }}
        onSave={save}
      />

      <ConfirmDialog
        open={!!confirmDel}
        title="Delete this specialty?"
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
