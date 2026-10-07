import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui'
import s from './Analytics.module.scss'

interface Props {
  children: ReactNode
  /** Clears a caught error when it changes — moving to another tab or range
   *  is a fresh start, not a retry of the thing that broke. */
  resetKey?: string
  /** Wrap the fallback in the page frame (for the boundary around the page). */
  page?: boolean
}

interface State {
  error: Error | null
  resetKey?: string
}

/**
 * Keeps a rendering bug in Analytics from blanking the whole console: the
 * sidebar stays usable and the broken part offers a retry instead of a white
 * screen. (React only lets a class component catch render errors.)
 */
export class AnalyticsBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[analytics] render failed', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    const fallback = (
      <div className={s.errorState} role="alert">
        <TriangleAlert size={26} strokeWidth={1.5} className={s.errorIcon} />
        <p className={s.errorTitle}>This part of Analytics ran into a problem</p>
        <p className={s.errorText}>
          The rest of the console still works. Try again — if it keeps happening, reload the page.
        </p>
        <Button size="sm" onClick={() => this.setState({ error: null })}>
          <RefreshCw size={13} /> Try again
        </Button>
      </div>
    )
    return this.props.page ? <div className={s.page}>{fallback}</div> : fallback
  }
}
