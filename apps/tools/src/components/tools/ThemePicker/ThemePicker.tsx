import { useId, type CSSProperties } from 'react'
import { Check } from 'lucide-react'
import { useT } from '@/i18n'
import { STORY_THEMES, type StoryTheme, type StoryThemeId } from '@/lib/story/themes'
import s from './ThemePicker.module.scss'

interface Props {
  value: StoryThemeId
  onChange: (id: StoryThemeId) => void
  /** Names the group for a screen reader — usually the section title. */
  label: string
}

const swatchStyle = (theme: StoryTheme) =>
  ({
    '--sw-bg-top': theme.bg[0],
    '--sw-bg-bottom': theme.bg[1],
    '--sw-text': theme.text,
    '--sw-accent': theme.accent,
  }) as CSSProperties

/**
 * The style choice, each option drawn as a tiny story in its own colours — a
 * swatch of the actual result rather than a colour name to imagine.
 *
 * Native radio inputs under the hood, so arrow keys move through the options
 * and a screen reader announces "1 of 6" without any of it being rebuilt.
 */
export function ThemePicker({ value, onChange, label }: Props) {
  const t = useT()
  const name = useId()

  return (
    <div className={s.container}>
      <div className={s.grid} role="radiogroup" aria-label={label}>
        {STORY_THEMES.map((theme) => (
          <label key={theme.id} className={s.option}>
            <input
              type="radio"
              name={name}
              className={s.input}
              value={theme.id}
              checked={value === theme.id}
              onChange={() => onChange(theme.id)}
            />
            <span className={s.swatch} style={swatchStyle(theme)} aria-hidden="true">
              <span className={s.miniTitle} />
              <span className={s.miniRow} />
              <span className={s.miniRow} />
              <span className={s.miniRow} />
              <span className={s.check}>
                <Check size={12} strokeWidth={3} />
              </span>
            </span>
            <span className={s.name}>{t(`themes.${theme.id}`)}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
