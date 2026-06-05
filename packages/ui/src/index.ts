// ─────────────────────────────────────────────────────────────
// @reserva/ui — shared visual component library + design system.
// Import the design tokens once per app:  import '@reserva/ui/styles'
// ─────────────────────────────────────────────────────────────

export { Button } from './components/Button/Button'
export { DatePicker } from './components/DatePicker/DatePicker'
export { TimePicker } from './components/TimePicker/TimePicker'
export { Input, Textarea } from './components/Input/Input'
export { Badge } from './components/Badge/Badge'
export type { BadgeVariant } from './components/Badge/Badge'
export { Card, CardHeader, CardTitle } from './components/Card/Card'
export { Table, Th, Td, Tr } from './components/Table/Table'
export { Modal, Drawer } from './components/Modal/Modal'
export { ConfirmDialog } from './components/ConfirmDialog/ConfirmDialog'
export { Pagination } from './components/Pagination/Pagination'
export { usePagination } from './components/Pagination/usePagination'
export { Select } from './components/Select/Select'
export type { SelectOption } from './components/Select/Select'
export { Toggle, Checkbox } from './components/Toggle/Toggle'
export { Avatar } from './components/Avatar/Avatar'
export { ToastProvider, useToast } from './components/Toast/Toast'
export { Empty } from './components/Empty/Empty'

// Re-export `initials` for convenience (originally lived alongside Avatar).
export { initials } from '@reserva/shared'
