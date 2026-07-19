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

  return (
    <div
      className="glass flex h-full flex-col overflow-hidden"
      style={{ borderRadius: 'var(--panel-radius)', "--guild-color": hexToRgb(color) } as React.CSSProperties}
    >
      <ChamberTransition>{children}</ChamberTransition>
    </div>
  )
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return "201 162 39"
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
}
