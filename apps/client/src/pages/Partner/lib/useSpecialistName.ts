import { useCallback } from 'react'
import { specialistDisplayName, type LocalizedText } from '@reserva/shared'
import type { PublicPartner } from '@/mock/partners'
import { useLocalized } from '@/i18n'

/**
 * How the public page shows a specialist's name: in the page language, in the
 * salon's name order (given name first when they type surname first). Initials
 * and "Book with {first name}" must be derived from THIS, never from `sp.name`.
 */
export function useSpecialistName(
  partner: Pick<PublicPartner, 'specialistNamesSurnameFirst'>,
): (sp: { name: string; nameI18n?: LocalizedText | null }) => string {
  const loc = useLocalized()
  const surnameFirst = partner.specialistNamesSurnameFirst
  return useCallback((sp) => specialistDisplayName(sp, loc, surnameFirst), [loc, surnameFirst])
}
