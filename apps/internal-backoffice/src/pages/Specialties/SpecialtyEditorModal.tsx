import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Modal, Button, Input, Select, Toggle } from '@/components/ui'
import { I18nField, CATALOG_LOCALES, type CatalogLocale } from '@/components/i18n/I18nField'
import type { Specialty, SpecialtyGroup, SpecialtyInput } from '@/services/specialties.service'
import s from './Specialties.module.scss'

interface Props {
  open: boolean
  editing: Specialty | null
  groups: SpecialtyGroup[]
  saving?: boolean
  onClose: () => void
  onSave: (input: SpecialtyInput, key: string) => void
}

const empty = (groupKey: string): SpecialtyInput & { key: string } => ({
  key: '',
  groupKey,
  name: '',
  nameI18n: { hy: '', ru: '' },
  roleName: '',
  roleNameI18n: { hy: '', ru: '' },
  aliases: [],
  sortOrder: 0,
  active: true,
})

/**
 * Create / edit one entry in the shared vocabulary.
 *
 * The form is built around the pair that makes this taxonomy work: `name` is
 * the FIELD OF WORK ("Hair styling") and `roleName` is the PRACTITIONER ("Hair
 * stylist"). Both are collected in all three languages because every partner in
 * the country reads these rows in their own — a missing Armenian name here is a
 * bug that reaches production UI, not a fallback.
 */
export function SpecialtyEditorModal({ open, editing, groups, saving, onClose, onSave }: Props) {
  const [form, setForm] = useState(() => empty(groups[0]?.key ?? ''))
  const [aliasDraft, setAliasDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  /** Which locale is missing, per field — drives the warning dot on the pills. */
  const [invalid, setInvalid] = useState<{
    name: Partial<Record<CatalogLocale, boolean>>
    roleName: Partial<Record<CatalogLocale, boolean>>
  }>({ name: {}, roleName: {} })

  useEffect(() => {
    if (!open) return
    setForm(editing ? { ...editing } : empty(groups[0]?.key ?? ''))
    setAliasDraft('')
    setError(null)
    setInvalid({ name: {}, roleName: {} })
  }, [open, editing, groups])

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const addAlias = () => {
    const value = aliasDraft.trim().toLowerCase()
    if (!value || form.aliases.includes(value)) { setAliasDraft(''); return }
    setForm((f) => ({ ...f, aliases: [...f.aliases, value] }))
    setAliasDraft('')
  }

  const submit = () => {
    // The key is permanent — it is stored on every referencing row — so it is
    // only editable on create.
    if (!editing && !/^[a-z][a-z0-9-]*$/.test(form.key)) {
      return setError('Key must be lowercase letters, digits and hyphens')
    }
    // Every locale of both names is required: this vocabulary is rendered to
    // every partner in their own language, so a blank one reaches production UI.
    const nameMissing: Partial<Record<CatalogLocale, boolean>> = {
      en: !form.name.trim(), hy: !form.nameI18n.hy.trim(), ru: !form.nameI18n.ru.trim(),
    }
    const roleMissing: Partial<Record<CatalogLocale, boolean>> = {
      en: !form.roleName.trim(), hy: !form.roleNameI18n.hy.trim(), ru: !form.roleNameI18n.ru.trim(),
    }
    const gaps = CATALOG_LOCALES.filter((l) => nameMissing[l] || roleMissing[l])
    if (gaps.length) {
      setInvalid({ name: nameMissing, roleName: roleMissing })
      return setError(
        `Both names are required in ${gaps.map((l) => l.toUpperCase()).join(', ')} — every partner reads this in their own language`,
      )
    }
    setError(null)
    setInvalid({ name: {}, roleName: {} })
    const { key, ...rest } = form
    onSave(rest, editing ? editing.key : key)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? `Edit “${editing.name}”` : 'New specialty'}
      subtitle="Shown to every partner in their own language"
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
            placeholder="hair-styling"
            help={editing ? 'Permanent — referenced by existing rows' : 'Lowercase, hyphens'}
          />
          <div className={s.field}>
            <label className={s.label}>Group</label>
            <Select
              value={form.groupKey}
              onChange={(v) => set('groupKey', v)}
              options={groups.map((g) => ({ value: g.key, label: g.name, sub: g.nameI18n.hy }))}
            />
          </div>
        </div>

        <div className={s.block}>
          <div className={s.blockHead}>
            Field of work
            <span className={s.blockHint}>Labels the work: “Hair styling”. Used for categories and filters.</span>
          </div>
          <I18nField
            label="Name"
            en={form.name}
            onEnChange={(v) => set('name', v)}
            i18n={form.nameI18n}
            onI18nChange={(next) => set('nameI18n', next)}
            placeholder="Hair styling"
            invalid={invalid.name}
          />
        </div>

        <div className={s.block}>
          <div className={s.blockHead}>
            Practitioner
            <span className={s.blockHint}>Labels the person: “Hair stylist”. Used for vacancies and titles.</span>
          </div>
          <I18nField
            label="Role name"
            en={form.roleName}
            onEnChange={(v) => set('roleName', v)}
            i18n={form.roleNameI18n}
            onI18nChange={(next) => set('roleNameI18n', next)}
            placeholder="Hair stylist"
            invalid={invalid.roleName}
          />
        </div>

        <div className={s.block}>
          <div className={s.blockHead}>
            Search aliases
            <span className={s.blockHint}>
              Never displayed — they exist so someone typing “hairdresser” or “парикмахер” finds this row.
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
                <button
                  type="button"
                  aria-label={`Remove ${a}`}
                  onClick={() => set('aliases', form.aliases.filter((x) => x !== a))}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className={s.grid2}>
          <Input
            label="Sort order"
            type="number"
            value={form.sortOrder}
            onChange={(e) => set('sortOrder', Number(e.target.value) || 0)}
            help="Lower sorts first inside the group"
          />
          <div className={s.toggleRow}>
            <div>
              <div className={s.toggleLabel}>Active</div>
              <div className={s.toggleDesc}>
                Off hides it from pickers. Existing listings keep rendering, which is how you
                retire an entry that is already in use.
              </div>
            </div>
            <Toggle checked={form.active} onChange={(v) => set('active', v)} />
          </div>
        </div>
      </div>
    </Modal>
  )
}
