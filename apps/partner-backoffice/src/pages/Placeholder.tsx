import type { LucideIcon } from 'lucide-react'

export function Placeholder({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div style={{
      padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 400, textAlign: 'center',
      animation: 'rise .35s cubic-bezier(.2,.7,.1,1) both',
    }}>
      <Icon size={40} strokeWidth={1} style={{ color: 'var(--fg-3)', marginBottom: 12 }} />
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, letterSpacing: '-0.02em', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>Coming soon — this section is under construction.</div>
    </div>
  )
}
