import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button, Empty } from '@reserva/ui'
import { useT } from '@/i18n'
import { useSeo } from '@/lib/useSeo'
import s from './NotFound.module.scss'

/**
 * An unknown URL.
 *
 * Marked noindex: a 404 crawled as a real page is a 404 that turns up in search
 * results. The board link is the only thing on it, because there is nothing
 * useful to say about a path that does not exist.
 */
export function NotFound() {
  const t = useT()
  useSeo({ title: `${t('detail.notFoundTitle')} — ${t('app.name')}`, noIndex: true })

  return (
    <div className={s.page}>
      <Empty
        icon={Compass}
        title={t('detail.notFoundTitle')}
        description={t('detail.notFoundBody')}
        action={
          <Link to="/">
            <Button variant="accent">{t('detail.notFoundAction')}</Button>
          </Link>
        }
      />
    </div>
  )
}
