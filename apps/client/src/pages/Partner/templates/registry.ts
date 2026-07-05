import type { PartnerTemplate } from '@/mock/partners'
import type { PartnerTemplateComponent } from './types'
import { ClassicTemplate } from './classic/ClassicTemplate'
import { TabbedTemplate } from './tabbed/TabbedTemplate'

/**
 * Maps a partner's `template` to its layout component. Adding a new template is
 * one entry here + one folder under templates/ — PartnerPage never changes
 * (open/closed). Every template implements the same TemplateProps contract and
 * composes its own section set; the booking flow stays shared in PartnerPage.
 */
export const TEMPLATES: Record<PartnerTemplate, PartnerTemplateComponent> = {
  classic: ClassicTemplate,
  tabbed: TabbedTemplate,
}

/** Resolve a template component, falling back to classic for unknown values. */
export function resolveTemplate(template: PartnerTemplate | undefined): PartnerTemplateComponent {
  return TEMPLATES[template ?? 'classic'] ?? TEMPLATES.classic
}
