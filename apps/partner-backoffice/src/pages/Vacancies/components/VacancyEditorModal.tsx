import { useEffect, useMemo, useState } from 'react'
import { Percent, Armchair, Wallet, MessagesSquare, Check } from 'lucide-react'
import { Modal, Button, Input, Textarea, Select } from '@/components/ui'
import { useI18n } from '@/i18n'
import { useLocalized } from '@/i18n/useLocalized'
import type { Location } from '@/types'
import type {
  SpecialtyGroup, Vacancy, VacancyInput, VacancyPayType,
} from '@/services/vacancies.service'
import { PERK_GROUPS } from '../lib/vacancyDisplay'
import s from './VacancyEditorModal.module.scss'

interface Props {
  open: boolean
  editing: Vacancy | null
  groups: SpecialtyGroup[]
  locations: Location[]
  saving?: boolean
  onClose: () => void
  onSave: (input: VacancyInput) => void
}

/** The four pay types, with the icon that makes each recognisable at a glance. */
const PAY_TYPES: { key: VacancyPayType; icon: typeof Percent }[] = [
  { key: 'percentage', icon: Percent },
  { key: 'rent', icon: Armchair },
  { key: 'salary', icon: Wallet },
  { key: 'negotiable', icon: MessagesSquare },
]

interface FormState {
  specialtyKey: string
  title: string
  locationId: string
  seats: number
  payType: VacancyPayType
  salonPercent: string
  salonPercentMax: string
  amount: string
  amountMax: string
  payPeriod: 'day' | 'week' | 'month'
  scheduleType: string
  scheduleNote: string
  experience: 'any' | 'junior' | 'experienced'
  perks: string[]
  applyMode: 'in_app' | 'phone' | 'both'
  contactPhone: string
  description: string
}

const emptyForm = (locationId: string): FormState => ({
  specialtyKey: '',
  title: '',
  locationId,
  seats: 1,
  payType: 'negotiable',
  salonPercent: '',
  salonPercentMax: '',
  amount: '',
  amountMax: '',
  payPeriod: 'month',
  scheduleType: '',
  scheduleNote: '',
  experience: 'any',
  perks: [],
  applyMode: 'both',
  contactPhone: '',
  description: '',
})

const fromVacancy = (v: Vacancy): FormState => ({
  specialtyKey: v.specialtyKey,
  title: v.title,
  locationId: v.locationId,
  seats: v.seats,
  payType: v.payType,
  salonPercent: v.salonPercent?.toString() ?? '',
  salonPercentMax: v.salonPercentMax?.toString() ?? '',
  amount: v.amount?.toString() ?? '',
  amountMax: v.amountMax?.toString() ?? '',
  payPeriod: v.payPeriod,
  scheduleType: v.scheduleType ?? '',
  scheduleNote: v.scheduleNote,
  experience: v.experience,
  perks: v.perks,
  applyMode: v.applyMode,
  contactPhone: v.contactPhone,
  description: v.description,
})

/** Empty string → null, so a cleared field clears the column. */
const num = (v: string): number | null => {
  const trimmed = v.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? Math.round(n) : null
}

/**
 * Create / edit a listing.
 *
 * One scrolling form rather than a wizard: a salon posting a chair fills this in
 * once and wants to see the whole shape of what they are advertising, not
 * discover on step 4 that they needed a phone number.
 *
 * Validation mirrors the server's DTO exactly — the checks here exist to give an
 * inline message instead of a toast, never as the authority.
 */
export function VacancyEditorModal({
  open, editing, groups, locations, saving, onClose, onSave,
}: Props) {
  const { t } = useI18n()
  const loc = useLocalized()
  const [form, setForm] = useState<FormState>(() => emptyForm(locations[0]?.id ?? ''))
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset whenever the modal opens, so a cancelled edit never leaks into the
  // next one.
  useEffect(() => {
    if (!open) return
    setForm(editing ? fromVacancy(editing) : emptyForm(locations[0]?.id ?? ''))
    setErrors({})
  }, [open, editing, locations])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const togglePerk = (key: string) =>
    setForm((f) => ({
      ...f,
      perks: f.perks.includes(key) ? f.perks.filter((p) => p !== key) : [...f.perks, key],
    }))

  const locationOptions = useMemo(
    () => locations.map((l) => ({ value: l.id, label: l.name, sub: l.address || undefined })),
    [locations],
  )

  /**
   * The specialty catalog as Select options.
   *
   * `label` is the practitioner ("Hair stylist") because that is what a listing
   * is FOR; `sub` is the craft ("Hair styling"). Options stay in catalog order,
   * so entries from the same group sit together while scrolling.
   *
   * `keywords` are matched but never rendered: the group name, both names in
   * every language, and the catalog's own synonyms — which is what lets someone
   * type "парикмахер", "hairdresser" or just "hair" and land on the right row.
   */
  const specialtyOptions = useMemo(
    () =>
      groups.flatMap((g) =>
        g.specialties.map((sp) => ({
          value: sp.key,
          label: loc(sp.roleName, sp.roleNameI18n),
          sub: loc(sp.name, sp.nameI18n),
          keywords: [
            g.name,
            loc(g.name, g.nameI18n),
            sp.name,
            sp.roleName,
            ...Object.values(sp.nameI18n ?? {}),
            ...Object.values(sp.roleNameI18n ?? {}),
            ...sp.aliases,
          ].filter((v): v is string => !!v),
        })),
      ),
    [groups, loc],
  )

  const isOther = form.specialtyKey === 'other'

  const validate = (): string | null => {
    const next: Record<string, string> = {}
    if (!form.specialtyKey) next.specialtyKey = t('vacancies.form.errSpecialty')
    if (!form.locationId) next.locationId = t('vacancies.form.errLocation')
    // Only 'other' needs a title — every other listing falls back to the
    // specialty's role name, which is a better headline than free text anyway.
    if (isOther && !form.title.trim()) next.title = t('vacancies.form.errTitleOther')
    if (form.payType === 'percentage' && num(form.salonPercent) == null) {
      next.salonPercent = t('vacancies.form.errPercent')
    }
    if ((form.payType === 'rent' || form.payType === 'salary') && num(form.amount) == null) {
      next.amount = t('vacancies.form.errAmount')
    }
    if (form.applyMode !== 'in_app' && !form.contactPhone.trim()) {
      next.contactPhone = t('vacancies.form.errPhone')
    }
    setErrors(next)
    return Object.keys(next)[0] ?? null
  }

  const submit = () => {
    if (validate()) return
    onSave({
      specialtyKey: form.specialtyKey,
      locationId: form.locationId,
      title: form.title.trim(),
      description: form.description.trim(),
      seats: form.seats,
      payType: form.payType,
      salonPercent: num(form.salonPercent),
      salonPercentMax: num(form.salonPercentMax),
      amount: num(form.amount),
      amountMax: num(form.amountMax),
      payPeriod: form.payPeriod,
      scheduleType: (form.scheduleType || null) as VacancyInput['scheduleType'],
      scheduleNote: form.scheduleNote.trim(),
      experience: form.experience,
      perks: form.perks,
      applyMode: form.applyMode,
      contactPhone: form.contactPhone.trim(),
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? t('vacancies.form.editTitle') : t('vacancies.form.newTitle')}
      subtitle={t('vacancies.form.subtitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
          <Button variant="accent" onClick={submit} disabled={saving}>
            {saving ? t('common.saving') : editing ? t('common.save') : t('vacancies.form.create')}
          </Button>
        </>
      }
    >
      <div className={s.form}>
        {/* ── Position ── */}
        <section className={s.section}>
          <h4 className={s.sectionTitle}>{t('vacancies.form.sectionPosition')}</h4>

          <div className={s.grid2}>
            <div className={s.field}>
              <label className={s.label}>{t('vacancies.form.specialty')}</label>
              <Select
                value={form.specialtyKey}
                onChange={(v) => set('specialtyKey', v)}
                options={specialtyOptions}
                placeholder={t('vacancies.form.specialtyPlaceholder')}
                searchable
                searchPlaceholder={t('vacancies.form.specialtySearch')}
              />
              {errors.specialtyKey && <div className={s.fieldError}>{errors.specialtyKey}</div>}
            </div>

            <Input
              label={isOther ? t('vacancies.form.titleRequired') : t('vacancies.form.title')}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder={t('vacancies.form.titlePlaceholder')}
              error={errors.title}
              help={isOther ? undefined : t('vacancies.form.titleHelp')}
            />
          </div>

          <div className={s.grid2}>
            <div className={s.field}>
              <label className={s.label}>{t('vacancies.form.branch')}</label>
              <Select
                value={form.locationId}
                onChange={(v) => set('locationId', v)}
                options={locationOptions}
                placeholder={t('vacancies.form.branchPlaceholder')}
              />
              {errors.locationId && <div className={s.fieldError}>{errors.locationId}</div>}
            </div>

            <Input
              label={t('vacancies.form.seats')}
              type="number"
              min={1}
              max={99}
              value={form.seats}
              onChange={(e) => set('seats', Math.max(1, Number(e.target.value) || 1))}
              help={t('vacancies.form.seatsHelp')}
            />
          </div>
        </section>

        {/* ── Terms ── */}
        <section className={s.section}>
          <h4 className={s.sectionTitle}>{t('vacancies.form.sectionTerms')}</h4>

          <div className={s.payGrid}>
            {PAY_TYPES.map(({ key, icon: Icon }) => (
              <button
                key={key}
                type="button"
                className={[s.payCard, form.payType === key ? s.payCardActive : ''].filter(Boolean).join(' ')}
                onClick={() => set('payType', key)}
                aria-pressed={form.payType === key}
              >
                <span className={s.payIcon}><Icon size={15} /></span>
                <span className={s.payText}>
                  <span className={s.payName}>{t(`vacancies.payType.${key}.name`)}</span>
                  <span className={s.payDesc}>{t(`vacancies.payType.${key}.desc`)}</span>
                </span>
                {form.payType === key && <Check size={14} className={s.payCheck} />}
              </button>
            ))}
          </div>

          {form.payType === 'percentage' && (
            <div className={s.grid2}>
              <Input
                label={t('vacancies.form.salonPercent')}
                type="number"
                min={0}
                max={100}
                value={form.salonPercent}
                onChange={(e) => set('salonPercent', e.target.value)}
                error={errors.salonPercent}
                help={t('vacancies.form.salonPercentHelp')}
              />
              <Input
                label={t('vacancies.form.salonPercentMax')}
                type="number"
                min={0}
                max={100}
                value={form.salonPercentMax}
                onChange={(e) => set('salonPercentMax', e.target.value)}
                help={t('vacancies.form.rangeHelp')}
              />
            </div>
          )}

          {(form.payType === 'rent' || form.payType === 'salary') && (
            <>
              <div className={s.grid2}>
                <Input
                  label={t(`vacancies.form.amount.${form.payType}`)}
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  error={errors.amount}
                  help={t('vacancies.form.amountHelp')}
                />
                <Input
                  label={t('vacancies.form.amountMax')}
                  type="number"
                  min={0}
                  value={form.amountMax}
                  onChange={(e) => set('amountMax', e.target.value)}
                  help={t('vacancies.form.rangeHelp')}
                />
              </div>
              <div className={s.field}>
                <label className={s.label}>{t('vacancies.form.payPeriod')}</label>
                <Select
                  value={form.payPeriod}
                  onChange={(v) => set('payPeriod', v as FormState['payPeriod'])}
                  options={(['month', 'week', 'day'] as const).map((p) => ({
                    value: p,
                    label: t(`vacancies.period.${p}`),
                  }))}
                />
              </div>
            </>
          )}

          {form.payType === 'negotiable' && (
            <p className={s.note}>{t('vacancies.form.negotiableNote')}</p>
          )}
        </section>

        {/* ── The work ── */}
        <section className={s.section}>
          <h4 className={s.sectionTitle}>{t('vacancies.form.sectionWork')}</h4>

          <div className={s.grid2}>
            <div className={s.field}>
              <label className={s.label}>{t('vacancies.form.scheduleType')}</label>
              <Select
                value={form.scheduleType}
                onChange={(v) => set('scheduleType', v)}
                options={[
                  { value: '', label: t('vacancies.form.notSpecified') },
                  ...(['full_time', 'part_time', 'shift', 'flexible'] as const).map((k) => ({
                    value: k,
                    label: t(`vacancies.schedule.${k}`),
                  })),
                ]}
              />
            </div>

            <div className={s.field}>
              <label className={s.label}>{t('vacancies.form.experience')}</label>
              <Select
                value={form.experience}
                onChange={(v) => set('experience', v as FormState['experience'])}
                options={(['any', 'junior', 'experienced'] as const).map((k) => ({
                  value: k,
                  label: t(`vacancies.experience.${k}`),
                }))}
              />
            </div>
          </div>

          <Input
            label={t('vacancies.form.scheduleNote')}
            value={form.scheduleNote}
            onChange={(e) => set('scheduleNote', e.target.value)}
            placeholder={t('vacancies.form.scheduleNotePlaceholder')}
          />

          {PERK_GROUPS.map((group) => (
            <div key={group.group} className={s.field}>
              <label className={s.label}>{t(`vacancies.form.perks.${group.group}`)}</label>
              <div className={s.chips}>
                {group.keys.map((key) => {
                  const on = form.perks.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      className={[s.chip, on ? s.chipOn : ''].filter(Boolean).join(' ')}
                      onClick={() => togglePerk(key)}
                    >
                      {t(`vacancies.perks.${key}`)}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </section>

        {/* ── Contact ── */}
        <section className={s.section}>
          <h4 className={s.sectionTitle}>{t('vacancies.form.sectionContact')}</h4>

          <div className={s.field}>
            <label className={s.label}>{t('vacancies.form.applyMode')}</label>
            <div className={s.chips}>
              {(['both', 'in_app', 'phone'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={form.applyMode === mode}
                  className={[s.chip, form.applyMode === mode ? s.chipOn : ''].filter(Boolean).join(' ')}
                  onClick={() => set('applyMode', mode)}
                >
                  {t(`vacancies.applyMode.${mode}`)}
                </button>
              ))}
            </div>
          </div>

          {form.applyMode !== 'in_app' && (
            <Input
              label={t('vacancies.form.contactPhone')}
              value={form.contactPhone}
              onChange={(e) => set('contactPhone', e.target.value)}
              placeholder="+374 XX XXX XXX"
              error={errors.contactPhone}
              help={t('vacancies.form.contactPhoneHelp')}
            />
          )}
        </section>

        {/* ── Description ── */}
        <section className={s.section}>
          <h4 className={s.sectionTitle}>{t('vacancies.form.sectionDescription')}</h4>
          <Textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={5}
            placeholder={t('vacancies.form.descriptionPlaceholder')}
            help={t('vacancies.form.descriptionHelp')}
          />
        </section>

        {/* A branchless partner cannot post at all — say so here rather than
            letting them fill the form and fail on save. */}
        {locations.length === 0 && (
          <p className={s.blocker}>{t('vacancies.form.noBranches')}</p>
        )}

        {/* Show which specialty was resolved, so "Other" is obviously different. */}
        {form.specialtyKey && !isOther && (
          <p className={s.note}>
            {t('vacancies.form.headlineHint', {
              value:
                form.title.trim() ||
                specialtyOptions.find((o) => o.value === form.specialtyKey)?.label ||
                '',
            })}
          </p>
        )}
      </div>
    </Modal>
  )
}
