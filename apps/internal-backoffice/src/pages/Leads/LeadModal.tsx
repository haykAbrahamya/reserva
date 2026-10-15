import { useEffect, useState } from 'react'
import { Button, Input, Modal, Select, Textarea } from '@/components/ui'
import { leadsService, type Lead, type LeadInput, type LeadStatus } from '@/services/leads.service'
import { errorMessage } from '@/services/errors'
import { STATUS_OPTIONS } from './leadLabels'
import s from './Leads.module.scss'

interface Props {
  open: boolean
  /** The lead to edit; null adds a new one by hand. */
  lead: Lead | null
  onClose: () => void
  onSaved: () => void
}

type Form = Required<Omit<LeadInput, 'status'>> & { status: LeadStatus }

const fromLead = (lead: Lead | null): Form => ({
  name: lead?.name ?? '',
  company: lead?.company ?? '',
  phone: lead?.phone ?? '',
  email: lead?.email ?? '',
  instagram: lead?.instagram ? `@${lead.instagram}` : '',
  notes: lead?.notes ?? '',
  status: lead?.status ?? 'new',
})

/** Add a lead by hand, or edit one: how to reach them, where it stands, what was said. */
export function LeadModal({ open, lead, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Form>(fromLead(lead))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(fromLead(lead))
      setError('')
    }
  }, [open, lead])

  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const reachable = [form.name, form.company, form.phone, form.email, form.instagram].some((v) => v.trim())

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      if (lead) await leadsService.update(lead.id, form)
      else await leadsService.create(form)
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onClose() }}
      title={lead ? 'Edit lead' : 'Add lead'}
      subtitle={lead ? undefined : 'Someone you met, called or found — a name or a way to reach them is enough.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="accent" onClick={save} disabled={saving || !reachable}>
            {saving ? 'Saving…' : lead ? 'Save' : 'Add lead'}
          </Button>
        </>
      }
    >
      {error && <div className={s.formError}>{error}</div>}
      <div className={s.form}>
        <div className={s.formRow}>
          <Input label="Name" value={form.name} onChange={set('name')} placeholder="Anna" />
          <Input label="Salon or business" value={form.company} onChange={set('company')} placeholder="Anna Beauty" />
        </div>
        <div className={s.formRow}>
          <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="+374 …" />
          <Input label="Instagram" value={form.instagram} onChange={set('instagram')} placeholder="@username or profile link" />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={set('email')} />
        <div>
          <span className={s.fieldLabel}>Status</span>
          <Select value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v as LeadStatus }))} options={STATUS_OPTIONS} />
        </div>
        <Textarea label="Notes" rows={4} value={form.notes} onChange={set('notes')} placeholder="Called on Monday — wants to try it after the holidays…" />
      </div>
    </Modal>
  )
}
