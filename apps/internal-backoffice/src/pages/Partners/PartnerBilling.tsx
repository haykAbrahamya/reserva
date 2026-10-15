import { useEffect, useState } from 'react'
import { CreditCard, Check, Play, CalendarDays } from 'lucide-react'
import { Badge, Button, DatePicker, Modal, useToast } from '@/components/ui'
import { partnersService, type BillingChange, type PartnerBilling as Billing } from '@/services/partners.service'
import { errorMessage } from '@/services/errors'
import { BILLING_BADGE, billingSummary, fmtDay } from './billing'
import s from './PartnerDetail.module.scss'

interface Props {
  partnerId: string
  billing: Billing
  onChanged: () => Promise<unknown> | void
}

/**
 * Where the partner's billing stands, and the two things staff do with it:
 * start the free trial, mark a month paid. The dates can be set by hand to
 * correct them. A reminder for staff — it never changes what the partner can use.
 */
export function PartnerBilling({ partnerId, billing, onChanged }: Props) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)

  const apply = async (change: BillingChange, done: string) => {
    setBusy(true)
    try {
      await partnersService.setBilling(partnerId, change)
      toast(done)
      await onChanged()
      return true
    } catch (err) {
      toast(errorMessage(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  const badge = BILLING_BADGE[billing.status]
  const trial = billing.trialStartedAt && billing.trialEndsAt
    ? `${fmtDay(billing.trialStartedAt)} – ${fmtDay(billing.trialEndsAt)}`
    : billing.trialEndsAt ? `until ${fmtDay(billing.trialEndsAt)}` : '—'

  return (
    <section className={`${s.card} ${s.billingCard}`}>
      <div className={s.billingHead}>
        <h2 className={s.billingTitle}><CreditCard size={15} className={s.cardTitleIcon} /> Billing</h2>
        <Badge variant={badge.variant} label={badge.label} />
        <span className={s.billingSummary}>{billingSummary(billing)}</span>
      </div>

      <dl className={s.billingDates}>
        <div>
          <dt>Free trial</dt>
          <dd>{trial}</dd>
        </div>
        <div>
          <dt>Paid until</dt>
          <dd>{billing.paidUntil ? fmtDay(billing.paidUntil) : '—'}</dd>
        </div>
      </dl>

      <div className={s.billingActions}>
        {billing.status === 'none' && (
          <Button variant="accent" size="sm" disabled={busy} onClick={() => apply({ action: 'startTrial' }, 'Free trial started — one month')}>
            <Play size={14} /> Start free trial
          </Button>
        )}
        <Button
          variant={billing.status === 'due' ? 'accent' : 'ghost'}
          size="sm"
          disabled={busy}
          onClick={() => apply({ action: 'markPaid' }, 'Marked a month paid')}
        >
          <Check size={14} /> Mark month paid
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(true)}>
          <CalendarDays size={14} /> Edit dates
        </Button>
      </div>
      <p className={s.hint}>A reminder for you — it never changes what the partner can use. A month paid starts the day after what is already covered.</p>

      <BillingDates
        open={editing}
        billing={billing}
        busy={busy}
        onClose={() => setEditing(false)}
        onSave={async (dates) => {
          if (await apply({ action: 'set', ...dates }, 'Billing dates saved')) setEditing(false)
        }}
      />
    </section>
  )
}

type Dates = { trialStartedAt: string | null; trialEndsAt: string | null; paidUntil: string | null }

/** The three dates by hand: to correct a mistake, or record a payment made elsewhere. */
function BillingDates({ open, billing, busy, onClose, onSave }: {
  open: boolean
  billing: Billing
  busy: boolean
  onClose: () => void
  onSave: (dates: Dates) => void
}) {
  const [form, setForm] = useState({ trialStartedAt: '', trialEndsAt: '', paidUntil: '' })

  // Fresh from the partner each time it opens.
  useEffect(() => {
    if (open) {
      setForm({
        trialStartedAt: billing.trialStartedAt ?? '',
        trialEndsAt: billing.trialEndsAt ?? '',
        paidUntil: billing.paidUntil ?? '',
      })
    }
  }, [open, billing])

  const backwards = !!form.trialStartedAt && !!form.trialEndsAt && form.trialStartedAt > form.trialEndsAt

  return (
    <Modal
      open={open}
      onClose={() => { if (!busy) onClose() }}
      title="Billing dates"
      subtitle="Both ends count: a trial to 14 Nov makes payment due on 15 Nov."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            variant="accent"
            disabled={busy || backwards}
            onClick={() => onSave({
              trialStartedAt: form.trialStartedAt || null,
              trialEndsAt: form.trialEndsAt || null,
              paidUntil: form.paidUntil || null,
            })}
          >
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className={s.billingForm}>
        <DatePicker label="Trial started" value={form.trialStartedAt} onChange={(v) => setForm((f) => ({ ...f, trialStartedAt: v }))} />
        <DatePicker label="Trial's last day" value={form.trialEndsAt} min={form.trialStartedAt || undefined} onChange={(v) => setForm((f) => ({ ...f, trialEndsAt: v }))} />
        <DatePicker label="Paid until (last day)" value={form.paidUntil} onChange={(v) => setForm((f) => ({ ...f, paidUntil: v }))} />
        {backwards && <p className={s.error}>The trial can't end before it starts.</p>}
      </div>
    </Modal>
  )
}
