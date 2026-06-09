import s from './ErrorFallback.module.scss'

/** Friendly full-screen fallback shown when the app crashes (Sentry captures it). */
export function ErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <div className={s.emoji}>😕</div>
        <h1 className={s.title}>Something went wrong</h1>
        <p className={s.text}>
          An unexpected error occurred. Our team has been notified. Please try again.
        </p>
        <button className={s.btn} onClick={resetError}>Try again</button>
      </div>
    </div>
  )
}
