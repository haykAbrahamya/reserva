import { AvatarPicker as SharedAvatarPicker } from '@reserva/ui'
import { useI18n } from '@/i18n'

interface Props {
  currentUrl: string
  name: string
  accent: string
  onPick: (file: File) => void
  onClear: () => void
  onError?: (msg: string) => void
}

/**
 * The specialist modal's photo control.
 *
 * The control itself lives in @reserva/ui — the vacancies app needs the same
 * one for a professional's own profile, and two copies of a file-validation
 * rule is how the two of them end up disagreeing about what "too large" means.
 * What stays here is the only thing that is genuinely local: this app's
 * translations.
 */
export function AvatarPicker({ currentUrl, name, accent, onPick, onClear, onError }: Props) {
  const { t } = useI18n()
  return (
    <SharedAvatarPicker
      currentUrl={currentUrl}
      name={name}
      accent={accent}
      onPick={onPick}
      onClear={onClear}
      onError={onError}
      labels={{
        title: t('specialists.modal.avatar.title'),
        hint: t('specialists.modal.avatar.hint'),
        upload: t('specialists.modal.avatar.upload'),
        change: t('specialists.modal.avatar.change'),
        remove: t('specialists.modal.avatar.remove'),
        notImage: t('specialists.modal.avatar.notImage'),
        tooLarge: t('specialists.modal.avatar.tooLarge'),
      }}
    />
  )
}
