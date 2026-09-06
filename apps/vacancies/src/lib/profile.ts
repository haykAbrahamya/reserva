import type { Professional } from '@/api/professionals.api'

/**
 * How finished a profile is, and what to do next about it.
 *
 * This exists because "make my profile public" is a decision nobody can make
 * well without knowing what a stranger would actually see. An account created
 * mid-application holds a name and a phone number; published as-is it is an
 * empty card that makes its owner look worse than not being listed at all.
 *
 * So the meter is not decoration — it is the argument for the next step, and
 * `nextStep` names that step rather than leaving someone to work out which of
 * six fields is missing.
 */

export type ProfileStepKey = 'avatar' | 'specialties' | 'experience' | 'about' | 'photos' | 'areas'

export interface ProfileStep {
  key: ProfileStepKey
  done: boolean
  /** Steps that carry more weight are the ones a salon looks at first. */
  weight: number
}

/**
 * Weighted, not a plain count.
 *
 * A photo and a specialty are what a salon scans; a district is useful but
 * nobody was ever hired for it. Weighting keeps the meter honest — filling in
 * the two cheap fields should not read as a nearly-complete profile.
 */
const STEP_WEIGHTS: Record<ProfileStepKey, number> = {
  avatar: 3,
  specialties: 3,
  about: 2,
  photos: 2,
  experience: 1,
  areas: 1,
}

export function profileSteps(p: Professional): ProfileStep[] {
  const done: Record<ProfileStepKey, boolean> = {
    avatar: Boolean(p.avatarUrl),
    specialties: p.specialtyKeys.length > 0,
    // `null` means "prefer not to say", which is an ANSWER — but an unanswered
    // field and a declined one look identical here on purpose: this measures
    // what a salon can see, and a salon sees neither.
    experience: p.experienceYears != null,
    about: p.about.trim().length >= 40,
    photos: p.photos.length > 0,
    areas: p.areaKeys.length > 0,
  }
  return (Object.keys(STEP_WEIGHTS) as ProfileStepKey[]).map((key) => ({
    key,
    done: done[key],
    weight: STEP_WEIGHTS[key],
  }))
}

/** 0–100. */
export function profileCompleteness(p: Professional): number {
  const steps = profileSteps(p)
  const total = steps.reduce((sum, s) => sum + s.weight, 0)
  const earned = steps.reduce((sum, s) => (s.done ? sum + s.weight : sum), 0)
  return Math.round((earned / total) * 100)
}

/** The heaviest unfinished step, or null when there is nothing left to do. */
export function nextProfileStep(p: Professional): ProfileStepKey | null {
  const pending = profileSteps(p)
    .filter((s) => !s.done)
    .sort((a, b) => b.weight - a.weight)
  return pending[0]?.key ?? null
}

/**
 * Whether the profile is worth publishing yet.
 *
 * A floor rather than a gate: publishing is never blocked, because it is their
 * page and their call. It only decides whether the settings screen leads with
 * encouragement or with a caution.
 */
export const PUBLISHABLE_THRESHOLD = 50

export function isWorthPublishing(p: Professional): boolean {
  return profileCompleteness(p) >= PUBLISHABLE_THRESHOLD
}
