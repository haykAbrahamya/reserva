import { useCallback } from 'react'
import { specialistDisplayName, type LocalizedText } from '@reserva/shared'
import { usePartner } from '@/store/app.store'
import { useLocalized } from './useLocalized'

/**
 * How every screen shows a specialist's name: in the UI language, in the
 * salon's name order (given name first when they type surname first). Use it
 * for anything a person READS — labels, avatars (initials follow), dropdown
 * options, confirm texts. Never for edit-form values: those stay as typed.
 */
export function useSpecialistName(): (sp: { name: string; nameI18n?: LocalizedText | null }) => string {
  const loc = useLocalized()
  const surnameFirst = usePartner()?.specialistNamesSurnameFirst
  return useCallback((sp) => specialistDisplayName(sp, loc, surnameFirst), [loc, surnameFirst])
}
