// ─────────────────────────────────────────────────────────────
// @reserva/ui — shared visual component library + design system.
// Import the design tokens once per app:  import '@reserva/ui/styles'
// ─────────────────────────────────────────────────────────────

export { Button } from './components/Button/Button'
export { DatePicker } from './components/DatePicker/DatePicker'
export type { DatePickerLabels } from './components/DatePicker/DatePicker'
export { DateRangePicker } from './components/DateRangePicker/DateRangePicker'
export type { DateRangePickerLabels } from './components/DateRangePicker/DateRangePicker'
export { TimePicker } from './components/TimePicker/TimePicker'
export { Input, Textarea, PasswordInput } from './components/Input/Input'
export type { PasswordInputProps } from './components/Input/Input'
export { Badge } from './components/Badge/Badge'
export type { BadgeVariant } from './components/Badge/Badge'
export { Card, CardHeader, CardTitle } from './components/Card/Card'
export { Table, Th, Td, Tr } from './components/Table/Table'
export { Modal, Drawer } from './components/Modal/Modal'
export { Lightbox } from './components/Lightbox/Lightbox'
export type { LightboxImage, LightboxLabels, LightboxProps } from './components/Lightbox/Lightbox'
export { ConfirmDialog } from './components/ConfirmDialog/ConfirmDialog'
export { Pagination } from './components/Pagination/Pagination'
export { usePagination } from './components/Pagination/usePagination'
export { Select } from './components/Select/Select'
export type { SelectOption } from './components/Select/Select'
export { SegmentedFilter } from './components/SegmentedFilter/SegmentedFilter'
export type { SegmentOption } from './components/SegmentedFilter/SegmentedFilter'
export { Chip } from './components/Chip/Chip'
export type { ChipProps } from './components/Chip/Chip'
export { RangeSlider } from './components/RangeSlider/RangeSlider'
export type { RangeSliderProps } from './components/RangeSlider/RangeSlider'
export { Toggle, Checkbox } from './components/Toggle/Toggle'
export { Avatar } from './components/Avatar/Avatar'
export { AvatarPicker, AVATAR_MAX_BYTES } from './components/AvatarPicker/AvatarPicker'
export type { AvatarPickerLabels, AvatarPickerProps } from './components/AvatarPicker/AvatarPicker'
export { NumberStepper } from './components/NumberStepper/NumberStepper'
export type { NumberStepperProps, QuickPick } from './components/NumberStepper/NumberStepper'
export { Logo, LogoMark } from './components/Logo/Logo'
export { ToastProvider, useToast } from './components/Toast/Toast'
export { Empty } from './components/Empty/Empty'
export { WhatsappIcon } from './components/icons/WhatsappIcon'
export { useDragDismiss } from './hooks/useDragDismiss'
/* Freezes the page behind an overlay, with scrollbar-width compensation so the
   layout does not jolt sideways. Used by Modal, Drawer and any app-level
   overlay of its own. */
export { useScrollLock } from './hooks/useScrollLock'
/* The portal-anchored popover behind Select/DatePicker/TimePicker. Exported so
   an app-level combobox gets the same escape-the-overflow behaviour instead of
   an absolutely-positioned panel that a modal body clips. */
export { useAnchoredDropdown } from './components/common/useAnchoredDropdown'

// Re-export `initials` for convenience (originally lived alongside Avatar).
export { initials } from '@reserva/shared'
