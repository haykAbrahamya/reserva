import { useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button, Empty } from '@reserva/ui'
import { useT } from '@/i18n'
import { useSeo } from '@/lib/useSeo'
import s from './NotFound.module.scss'

/** An unknown URL. Kept out of the index, with one way back to the grid. */
export function NotFound() {
  const t = useT()
  const navigate = useNavigate()
  useSeo({ title: `${t('notFound.title')} — ${t('app.name')}`, noIndex: true })

  return (
    <div className={s.page}>
      <Empty
        icon={Compass}
        title={t('notFound.title')}
        description={t('notFound.body')}
        action={
          <Button variant="accent" onClick={() => navigate('/')}>
            {t('notFound.action')}
          </Button>
        }
      />
    </div>
  )
}
