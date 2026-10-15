import { Hand, Inbox, UserPlus, Wrench, type LucideIcon } from 'lucide-react'
import type { LeadSource, LeadStatus } from '@/services/leads.service'

/** The stages, in the order a lead moves through them. */
export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  partner: 'Became partner',
  lost: 'Not interested',
}

export const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as LeadStatus[]).map((value) => ({
  value,
  label: STATUS_LABELS[value],
}))

/** Where a lead came from, as a chip on its card. */
export const SOURCE_META: Record<LeadSource, { label: string; icon: LucideIcon }> = {
  signup: { label: 'Sign-up form', icon: UserPlus },
  demo: { label: 'Demo request', icon: Inbox },
  tools: { label: 'Tools', icon: Wrench },
  manual: { label: 'Added by hand', icon: Hand },
}
