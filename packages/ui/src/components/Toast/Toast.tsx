import { createContext, useContext, useState, useCallback } from 'react'
import s from './Toast.module.scss'

interface ToastCtx { toast: (msg: string) => void }
const Ctx = createContext<ToastCtx>({ toast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)

  const toast = useCallback((m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(null), 3000)
  }, [])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      {msg && <div className={s.toast}>{msg}</div>}
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx).toast
