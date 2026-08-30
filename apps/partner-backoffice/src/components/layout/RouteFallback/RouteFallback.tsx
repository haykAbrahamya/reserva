import s from './RouteFallback.module.scss'

/**
 * Shown while a route's chunk downloads.
 *
 * Deliberately a skeleton rather than a spinner: it keeps the page's rough
 * shape, so switching sections reads as "loading this" instead of the layout
 * collapsing and snapping back. On a fast connection the chunk usually arrives
 * before the fade-in finishes, so nothing is seen at all.
 */
export function RouteFallback() {
  return (
    <div className={s.wrap} role="status" aria-busy="true">
      <div className={s.head}>
        <div className={[s.bar, s.title].join(' ')} />
        <div className={[s.bar, s.sub].join(' ')} />
      </div>
      <div className={s.grid}>
        <div className={s.block} />
        <div className={s.block} />
        <div className={s.block} />
      </div>
    </div>
  )
}
