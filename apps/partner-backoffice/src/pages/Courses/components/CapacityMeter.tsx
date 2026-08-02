import s from './CapacityMeter.module.scss'

interface Props {
  /** Confirmed members occupying a seat. */
  filled: number
  /** Max seats. 0 = unlimited (renders just the count, no bar). */
  capacity: number
  /** "{filled} / {capacity}" — pass the localized "unlimited" word for cap 0. */
  label: string
}

/** Seats indicator: a filled bar + count. Turns amber when nearly full and red
 *  when full, so a salon sees at a glance when a run is filling up. */
export function CapacityMeter({ filled, capacity, label }: Props) {
  const unlimited = !capacity || capacity <= 0
  const ratio = unlimited ? 0 : Math.min(1, filled / capacity)
  const tone = unlimited ? 'ok' : ratio >= 1 ? 'full' : ratio >= 0.8 ? 'near' : 'ok'

  return (
    <div className={s.wrap}>
      <div className={s.head}>
        <span className={s.count}>{label}</span>
      </div>
      {!unlimited && (
        <div className={s.track}>
          <div className={[s.fill, s[tone]].join(' ')} style={{ width: `${ratio * 100}%` }} />
        </div>
      )}
    </div>
  )
}
