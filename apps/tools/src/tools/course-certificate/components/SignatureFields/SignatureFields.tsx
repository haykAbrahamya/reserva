import { Input, Toggle } from '@reserva/ui'
import { useT } from '@/i18n'
import { FieldGrid } from '@/components/tools/FieldGrid/FieldGrid'
import { LIMITS, type CertificateDraft, type Signer } from '../../model'
import s from './SignatureFields.module.scss'

interface Props {
  draft: CertificateDraft
  onSigner: (index: 0 | 1, patch: Partial<Signer>) => void
  onSeal: (seal: boolean) => void
}

const INDEXES = [0, 1] as const

/**
 * Who signs: up to two people, each with a line to sign on above their name
 * and title — a signer left empty is left off — and whether there is a
 * place for the school's stamp.
 */
export function SignatureFields({ draft, onSigner, onSeal }: Props) {
  const t = useT()

  return (
    <div className={s.fields}>
      {INDEXES.map((index) => (
        <fieldset key={index} className={s.signer}>
          <legend className={s.legend}>{t('courseCertificate.signatures.signer', { n: index + 1 })}</legend>
          <FieldGrid>
            <Input
              label={t('courseCertificate.signatures.name')}
              value={draft.signers[index].name}
              maxLength={LIMITS.signerName}
              placeholder={t('courseCertificate.signatures.namePlaceholder')}
              onChange={(e) => onSigner(index, { name: e.target.value })}
            />
            <Input
              label={t('courseCertificate.signatures.title')}
              value={draft.signers[index].title}
              maxLength={LIMITS.signerTitle}
              placeholder={t(`courseCertificate.signatures.titlePlaceholder${index + 1}`)}
              onChange={(e) => onSigner(index, { title: e.target.value })}
            />
          </FieldGrid>
        </fieldset>
      ))}
      <p className={s.hint}>{t('courseCertificate.signatures.hint')}</p>

      <label className={s.seal}>
        <Toggle checked={draft.seal} onChange={onSeal} ariaLabel={t('courseCertificate.signatures.seal')} />
        <span className={s.sealText}>
          <span className={s.sealTitle}>{t('courseCertificate.signatures.seal')}</span>
          <span className={s.sealHint}>{t('courseCertificate.signatures.sealHint')}</span>
        </span>
      </label>
    </div>
  )
}
