import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PublicPartner } from '@/mock/partners'
import { bookableLocations, branchesDiffer } from '@/services/booking.service'

const EVENT = 'reserva:branch'
const storageKey = (slug: string) => `reserva.branch.${slug}`

function readStored(slug: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(slug))
  } catch {
    return null
  }
}

function writeStored(slug: string, id: string) {
  try {
    window.localStorage.setItem(storageKey(slug), id)
  } catch {
    /* private mode / blocked storage — the choice just won't be remembered */
  }
}

export interface BranchChoice {
  /** Every bookable branch, in display order. */
  branches: PublicPartner['locations']
  /**
   * The branch the visitor is looking at — or null when choosing a branch
   * changes nothing (one branch, or identical services and prices everywhere),
   * in which case lists render exactly as they always have.
   */
  branchId: string | null
  /** Whether the page should offer a branch switcher at all. */
  active: boolean
  setBranchId: (id: string) => void
}

/**
 * The visitor's chosen branch for a multi-branch salon.
 *
 * Starts from `?branch=<id>` (shareable links, e.g. one per branch on
 * Instagram), else the visitor's last choice on this salon, else the first
 * branch. Kept in step across every section of the page, so switching branch
 * in the services list also scopes the team grid and the booking flow.
 */
export function useBranchChoice(partner: PublicPartner): BranchChoice {
  const branches = useMemo(() => bookableLocations(partner), [partner])
  const active = useMemo(() => branchesDiffer(partner), [partner])

  const [branchId, setBranchIdState] = useState<string | null>(() => {
    const fromUrl =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('branch') : null
    const saved = typeof window !== 'undefined' ? readStored(partner.slug) : null
    const pick = [fromUrl, saved].find((id) => id && branches.some((b) => b.id === id))
    return pick ?? branches[0]?.id ?? null
  })

  // Another section switched branch → follow it.
  useEffect(() => {
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (branches.some((b) => b.id === id)) setBranchIdState(id)
    }
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [branches])

  const setBranchId = useCallback(
    (id: string) => {
      setBranchIdState(id)
      writeStored(partner.slug, id)
      window.dispatchEvent(new CustomEvent(EVENT, { detail: id }))
    },
    [partner.slug],
  )

  return { branches, branchId: active ? branchId : null, active, setBranchId }
}
