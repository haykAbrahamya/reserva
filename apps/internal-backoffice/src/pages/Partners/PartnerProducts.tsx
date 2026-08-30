import { useState } from 'react'
import {
  CalendarDays, GraduationCap, Briefcase, Presentation, Package, Lock, Clock,
} from 'lucide-react'
import { Badge, Toggle, useToast } from '@/components/ui'
import { partnersService, type PartnerProduct } from '@/services/partners.service'
import { errorMessage } from '@/services/errors'
import s from './PartnerDetail.module.scss'

interface Props {
  partnerId: string
  products: PartnerProduct[]
  /** Refetch the partner after a change — usage and settings come back with it. */
  onChanged: () => Promise<void> | void
}

/**
 * Icons per product key, with a neutral fallback.
 *
 * A product seeded before its icon is added here still renders correctly — the
 * whole section is driven by the catalog the API returns, so a new product
 * appears in the console with no code change at all.
 */
const ICONS: Record<string, typeof CalendarDays> = {
  bookings: CalendarDays,
  courses: GraduationCap,
  vacancies: Briefcase,
  seminars: Presentation,
}

/**
 * The products a partner has, one card each: whether it is granted, how much it
 * is being used, and its own settings.
 *
 * The split is deliberate — an ENTITLEMENT ("may they use this at all") is the
 * header toggle, while product SETTINGS ("how does it behave") live inside the
 * card. Organization-wide settings are not here at all; they belong to the
 * partner, not to any one product.
 */
export function PartnerProducts({ partnerId, products, onChanged }: Props) {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (key: string, fn: () => Promise<unknown>, message: string) => {
    setBusy(key)
    try {
      await fn()
      await onChanged()
      toast(message)
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const toggleProduct = (p: PartnerProduct, enabled: boolean) =>
    run(
      p.key,
      () => partnersService.setProduct(partnerId, p.key, enabled),
      `${p.name} ${enabled ? 'enabled' : 'disabled'}`,
    )

  const toggleSetting = (p: PartnerProduct, setting: string, value: boolean) =>
    run(
      `${p.key}:${setting}`,
      () => partnersService.setProductSetting(partnerId, p.key, setting, value),
      'Setting updated',
    )

  if (products.length === 0) {
    return (
      <section className={s.card}>
        <h2 className={s.cardTitle}><Package size={15} className={s.cardTitleIcon} /> Products</h2>
        <p className={s.hint}>No products in the catalog yet.</p>
      </section>
    )
  }

  return (
    <section className={s.productsSection}>
      <div className={s.sectionHead}>
        <h2 className={s.sectionTitle}><Package size={15} className={s.cardTitleIcon} /> Products</h2>
        <span className={s.sectionCount}>
          {products.filter((p) => p.enabled).length} of {products.length} enabled
        </span>
      </div>

      <div className={s.productGrid}>
        {products.map((p) => {
          const Icon = ICONS[p.key] ?? Package
          const pending = busy === p.key
          const trialing = p.status === 'trialing'

          return (
            <article
              key={p.key}
              className={[s.productCard, p.enabled ? '' : s.productOff].filter(Boolean).join(' ')}
            >
              <header className={s.productHead}>
                <span className={s.productIcon}><Icon size={16} /></span>
                <div className={s.productTitleWrap}>
                  <div className={s.productName}>
                    {p.name}
                    {!p.selfServe && (
                      // Curated: staff grant it, partners cannot take it themselves.
                      <span className={s.curated} title="Curated — granted by platform staff only">
                        <Lock size={11} />
                      </span>
                    )}
                  </div>
                  <div className={s.productStatus}>
                    {p.enabled ? (
                      <Badge variant="active" label={trialing ? 'Trial' : 'Enabled'} />
                    ) : (
                      <Badge variant="inactive" label={p.status === 'suspended' ? 'Suspended' : 'Not enabled'} />
                    )}
                    {trialing && p.trialEndsAt && (
                      <span className={s.trialNote}>
                        <Clock size={11} /> ends {new Date(p.trialEndsAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Toggle
                  checked={p.enabled}
                  disabled={pending}
                  onChange={(v) => toggleProduct(p, v)}
                />
              </header>

              {p.description && <p className={s.productDesc}>{p.description}</p>}

              {/* Usage — only meaningful once the product is actually in use. */}
              {p.enabled && p.usage.length > 0 && (
                <div className={s.usageRow}>
                  {p.usage.map((u) => (
                    <div key={u.label} className={s.usageStat}>
                      <span className={s.usageValue}>{u.value}</span>
                      <span className={s.usageLabel}>{u.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Product-specific configuration. Hidden while disabled — these
                  settings have no effect until the product is granted. */}
              {p.enabled && p.settings.length > 0 && (
                <div className={s.settingList}>
                  {p.settings.map((setting) => (
                    <div key={setting.key} className={s.settingRow}>
                      <div className={s.toggleText}>
                        <div className={s.toggleLabel}>{setting.label}</div>
                        <div className={s.toggleDesc}>{setting.description}</div>
                      </div>
                      <Toggle
                        checked={setting.value}
                        disabled={busy === `${p.key}:${setting.key}`}
                        onChange={(v) => toggleSetting(p, setting.key, v)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {!p.enabled && (
                <p className={s.productOffHint}>
                  Enable to give this partner access. Usage and settings appear once it is on.
                </p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
