import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Modal, Button, Input, Select, Toggle } from '@/components/ui'
import { I18nField, CATALOG_LOCALES, type CatalogLocale } from '@/components/i18n/I18nField'
import type { Area, AreaInput, AreaKind } from '@/services/areas.service'
import s from './Areas.module.scss'

interface Props {
  open: boolean
  editing: Area | null
  /** The whole catalog — used to offer parents and to prevent cycles. */
  areas: Area[]
  saving?: boolean
  onClose: () => void
  onSave: (input: AreaInput, key: string) => void
}

const KINDS: { value: AreaKind; label: string; sub: string }[] = [
  { value: 'region', label: 'Region', sub: 'A province (marz) — groups cities' },
  { value: 'city', label: 'City', sub: 'Selectable by a branch' },
  { value: 'district', label: 'District', sub: 'A district inside a city' },
]

const empty = (): AreaInput & { key: string } => ({
  key: '',
  parentKey: null,
  kind: 'city',
  name: '',
  nameI18n: { hy: '', ru: '' },
  aliases: [],
  lat: null,
  lng: null,
  sortOrder: 0,
  active: true,
})

/** Empty → null, so a cleared coordinate clears the column. */
const num = (v: string): number | null => {
  const t = v.trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/**
 * Create / edit one place in the catalog.
 *
 * Every name is collected in all three languages through the same I18nField the
 * partner backoffice uses, because a place with no Armenian name is unusable in
 * the Armenian UI — these are required data, not overrides.
 */
export function AreaEditorModal({ open, editing, areas, saving, onClose, onSave }: Props) {
  const [form, setForm] = useState(empty)
  const [aliasDraft, setAliasDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [invalid, setInvalid] = useState<Partial<Record<CatalogLocale, boolean>>>({})

  useEffect(() => {
    if (!open) return
    setForm(editing ? { ...editing, key: editing.key } : empty())
    setAliasDraft('')
    setError(null)
    setInvalid({})
  }, [open, editing])

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  /**
   * Valid parents: any area except the row itself and its own descendants —
   * otherwise the tree gains a cycle and expanding a parent loops forever. The
   * server enforces this too; offering only legal options means staff never see
   * that error.
   */
  const parentOptions = useMemo(() => {
    const descendants = new Set<string>()
    if (editing) {
      const walk = (key: string) => {
        for (const a of areas) {
          if (a.parentKey === key && !descendants.has(a.key)) {
            descendants.add(a.key)
            walk(a.key)
          }
        }
      }
      descendants.add(editing.key)
      walk(editing.key)
    }
    return [
      { value: '', label: 'None — top level', sub: 'A province or a standalone city' },
      ...areas
        .filter((a) => !descendants.has(a.key))
        .map((a) => ({
          value: a.key,
          label: a.name,
          sub: `${a.kind}${a.parent ? ` · in ${a.parent.name}` : ''}`,
          keywords: [a.key, a.nameI18n?.hy, a.nameI18n?.ru, ...(a.aliases ?? [])].filter(
            (v): v is string => !!v,
          ),
        })),
    ]
  }, [areas, editing])

  const addAlias = () => {
    const value = aliasDraft.trim().toLowerCase()
    if (!value || form.aliases.includes(value)) { setAliasDraft(''); return }
    setForm((f) => ({ ...f, aliases: [...f.aliases, value] }))
    setAliasDraft('')
  }

  const submit = () => {
    // The key is permanent — stored on every branch that references it — so it
    // is only editable on create.
    if (!editing && !/^[a-z][a-z0-9-]*$/.test(form.key)) {
      return setError('Key must be lowercase letters, digits and hyphens')
    }
    const missing: Partial<Record<CatalogLocale, boolean>> = {}
    if (!form.name.trim()) missing.en = true
    if (!form.nameI18n.hy.trim()) missing.hy = true
    if (!form.nameI18n.ru.trim()) missing.ru = true
    if (Object.keys(missing).length) {
      setInvalid(missing)
      const names = CATALOG_LOCALES.filter((l) => missing[l]).map((l) => l.toUpperCase())
      return setError(`Name is required in ${names.join(', ')} — every partner reads this in their own language`)
    }

    setError(null)
    setInvalid({})
    const { key, ...rest } = form
    onSave({ ...rest, parentKey: rest.parentKey || null }, editing ? editing.key : key)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? `Edit “${editing.name}”` : 'New area'}
      subtitle="Cities and districts partners tag their branches with"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="accent" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className={s.form}>
        {error && <div className={s.formError}>{error}</div>}

        <div className={s.grid2}>
          <Input
            label="Key"
            value={form.key}
            onChange={(e) => set('key', e.target.value)}
            disabled={!!editing}
            placeholder="yerevan-davtashen"
            help={editing ? 'Permanent — referenced by existing branches' : 'Lowercase, hyphens'}
          />
          <div className={s.field}>
            <label className={s.label}>Kind</label>
            <Select
              value={form.kind}
              onChange={(v) => set('kind', v as AreaKind)}
              options={KINDS}
            />
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label}>Parent</label>
          <Select
            value={form.parentKey ?? ''}
            onChange={(v) => set('parentKey', v || null)}
            options={parentOptions}
            searchable
            searchPlaceholder="Search areas…"
          />
          <span className={s.fieldHint}>
            A district belongs to its city; a city to its province. Top-level areas are the
            filter groups partners see.
          </span>
        </div>

        <I18nField
          label="Name"
          en={form.name}
          onEnChange={(v) => set('name', v)}
          i18n={form.nameI18n}
          onI18nChange={(next) => set('nameI18n', next)}
          placeholder="Davtashen"
          invalid={invalid}
          hint="Shown to partners and seekers in their own language. All three are required."
        />

        <div className={s.block}>
          <div className={s.blockHead}>
            Search aliases
            <span className={s.blockHint}>
              Never displayed — they exist so people find the place by the name they use.
              Include Soviet-era names (“leninakan”, “кировакан”), colloquial ones
              (“ejmiatsin”, “masiv”) and transliterations (“erevan”, “ереван”).
            </span>
          </div>
          <div className={s.aliasRow}>
            <Input
              value={aliasDraft}
              onChange={(e) => setAliasDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addAlias() }
              }}
              placeholder="Type a synonym, press Enter"
            />
            <Button variant="ghost" onClick={addAlias}>Add</Button>
          </div>
          <div className={s.aliasChips}>
            {form.aliases.length === 0 && <span className={s.muted}>No aliases yet</span>}
            {form.aliases.map((a) => (
              <span key={a} className={s.aliasChip}>
                {a}
                <button type="button" aria-label={`Remove ${a}`} onClick={() => set('aliases', form.aliases.filter((x) => x !== a))}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className={s.grid3}>
          <Input
            label="Latitude"
            value={form.lat ?? ''}
            onChange={(e) => set('lat', num(e.target.value))}
            placeholder="40.2283"
            help="Centroid — optional"
          />
          <Input
            label="Longitude"
            value={form.lng ?? ''}
            onChange={(e) => set('lng', num(e.target.value))}
            placeholder="44.4640"
            help="Used to centre a map"
          />
          <Input
            label="Sort order"
            type="number"
            value={form.sortOrder}
            onChange={(e) => set('sortOrder', Number(e.target.value) || 0)}
            help="Lower sorts first"
          />
        </div>

        <div className={s.toggleRow}>
          <div>
            <div className={s.toggleLabel}>Active</div>
            <div className={s.toggleDesc}>
              Off hides it from pickers. Branches already in it keep working, which is how
              you retire a place that is still referenced.
            </div>
          </div>
          <Toggle checked={form.active} onChange={(v) => set('active', v)} />
        </div>
      </div>
    </Modal>
  )
}
