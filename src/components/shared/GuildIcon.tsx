/**
 * Unified renderer for `guild.icon`. The field can be:
 *   - an emoji character (legacy path)
 *   - a base64 data: URL (legacy in-DB uploads)
 *   - an https URL (new S3-hosted guild icons)
 *
 * All three render into the same visual slot so guild badges keep
 * working across sidebar, cards, and chamber headers as we migrate.
 */
interface GuildIconProps {
  icon?: string | null
  /** Tailwind sizing class(es), e.g. "h-5 w-5 object-contain" */
  className?: string
  /** Only applied when rendering an emoji character */
  color?: string
  /** Emoji fallback when guild has no icon set */
  fallback?: string
}

function isImageIcon(icon: string | null | undefined): icon is string {
  if (!icon) return false
  return icon.startsWith("data:") || icon.startsWith("http")
}

export function GuildIcon({ icon, className, color, fallback = "⬡" }: GuildIconProps) {
  if (isImageIcon(icon)) {
    return <img src={icon} alt="" className={className} />
  }
  return (
    <span className={className} style={color ? { color } : undefined}>
      {icon || fallback}
    </span>
  )
}
