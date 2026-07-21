import { ChamberTransition } from "@/components/shell"
import { getGuild } from "@/lib/guilds"
import type { ReactNode } from "react"

interface GuildLayoutProps {
  children: ReactNode
  params: Promise<{ guildId: string }>
}

export default async function GuildLayout({ children, params }: GuildLayoutProps) {
  const { guildId } = await params
  const guild = await getGuild(guildId)

  // Fallback color if guild not found
  const color = guild?.color || "#c9a227"

  const rgb = hexToRgb(color)

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      style={{
        borderRadius: 'var(--panel-radius)',
        "--guild-color": rgb,
        background: `rgba(16, 11, 6, 0.72)`,
        backdropFilter: `blur(28px) saturate(160%)`,
        WebkitBackdropFilter: `blur(28px) saturate(160%)`,
        border: `1px solid rgb(${rgb} / 0.15)`,
      } as React.CSSProperties}
    >
      {/* Guild-colour atmospheric tint */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 110% 50% at 50% -10%, rgb(${rgb} / 0.12) 0%, transparent 65%)`,
          borderRadius: 'inherit',
        }}
      />
      <ChamberTransition>{children}</ChamberTransition>
    </div>
  )
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return "201 162 39"
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
}
