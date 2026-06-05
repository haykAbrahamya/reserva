import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Select } from '../Select/Select'
import s from './Pagination.module.scss'

interface PaginationProps {
  /** 1-based current page. */
  page: number
  /** Total number of pages. */
  pageCount: number
  onPageChange: (page: number) => void
  /** Optional "Showing X–Y of Z" summary text (already localized by caller). */
  summary?: string
  /** Page-size selector — pass all three to enable it. */
  pageSize?: number
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  /** Label before the page-size selector, e.g. "Per page". */
  pageSizeLabel?: string
}

/**
 * Page navigation for desktop data tables: optional page-size selector + a
 * windowed range of page numbers with ellipses. The whole bar shows whenever
 * there are rows; the number nav collapses when there's only one page.
 */
export function Pagination({
  page, pageCount, onPageChange, summary,
  pageSize, onPageSizeChange, pageSizeOptions = [5, 10, 25, 50], pageSizeLabel,
}: PaginationProps) {
  const showSizeSelector = pageSize != null && !!onPageSizeChange
  // Nothing to show at all: single page and no size selector.
  if (pageCount <= 1 && !showSizeSelector) return null

  const go = (p: number) => onPageChange(Math.min(Math.max(1, p), pageCount))

  return (
    <div className={s.bar}>
      <div className={s.left}>
        {showSizeSelector && (
          <div className={s.sizeWrap}>
            {pageSizeLabel && <span className={s.sizeLabel}>{pageSizeLabel}</span>}
            <Select
              className={s.sizeSelect}
              size="sm"
              searchable={false}
              value={String(pageSize)}
              onChange={v => onPageSizeChange!(Number(v))}
              options={pageSizeOptions.map(n => ({ value: String(n), label: String(n) }))}
            />
          </div>
        )}
        {summary && <span className={s.summary}>{summary}</span>}
      </div>

      {pageCount > 1 && (
        <div className={s.pages}>
          <button
            type="button"
            className={s.navBtn}
            disabled={page <= 1}
            onClick={() => go(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={15} />
          </button>

          {pageRange(page, pageCount).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className={s.gap}>…</span>
            ) : (
              <button
                key={p}
                type="button"
                className={[s.page, p === page ? s.active : ''].filter(Boolean).join(' ')}
                onClick={() => go(p)}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            className={s.navBtn}
            disabled={page >= pageCount}
            onClick={() => go(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

/** Build a windowed page list: 1 … 4 5 [6] 7 8 … 20 */
function pageRange(current: number, total: number): (number | '…')[] {
  const out: (number | '…')[] = []
  const window = 1 // pages on each side of current
  const push = (n: number) => out.push(n)

  const left = Math.max(2, current - window)
  const right = Math.min(total - 1, current + window)

  push(1)
  if (left > 2) out.push('…')
  for (let p = left; p <= right; p++) push(p)
  if (right < total - 1) out.push('…')
  if (total > 1) push(total)
  return out
}
