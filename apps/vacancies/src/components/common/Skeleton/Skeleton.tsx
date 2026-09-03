import s from './Skeleton.module.scss'

interface Props {
  /** CSS width — a percentage keeps a placeholder honest inside a flex row. */
  w?: string
  h?: number
  radius?: number
  className?: string
}

/**
 * A loading placeholder.
 *
 * Used instead of a spinner for the results list, because a skeleton of the
 * right SHAPE keeps the page height stable: a spinner collapses the layout and
 * then pushes everything down when data lands, which is what makes a board
 * feel like it jumps while you read it.
 */
export function Skeleton({ w = '100%', h = 14, radius = 6, className }: Props) {
  return (
    <span
      className={[s.sk, className].filter(Boolean).join(' ')}
      style={{ width: w, height: h, borderRadius: radius }}
      aria-hidden="true"
    />
  )
}
