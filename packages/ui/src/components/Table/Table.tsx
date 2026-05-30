import s from './Table.module.scss'

export function Table({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={s.wrap}>
      <table className={[s.table, className].filter(Boolean).join(' ')}>{children}</table>
    </div>
  )
}

export function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <th className={[s.th, className].filter(Boolean).join(' ')}>{children}</th>
}

export function Td({ children, className = '', style }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <td className={[s.td, className].filter(Boolean).join(' ')} style={style}>{children}</td>
}

interface TrProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean
}

export function Tr({ selected, className = '', children, ...props }: TrProps) {
  return (
    <tr className={[s.tr, selected ? s.selected : '', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </tr>
  )
}
