"use client"

import Link from "next/link"
import { ChevronRight, Lock } from "lucide-react"
import type { Guild } from "@/types/guild"

interface GuildListRowProps {
  guild: Guild
  username: string
  isMember: boolean
}

export function GuildListRow({ guild, username: _username, isMember }: GuildListRowProps) {
  const color = guild.color || "#c9a227"
  const href = isMember ? `/guild/${guild.id}` : undefined

  const inner = (
    <div className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-black-light">
      <div className="shrink-0 text-xl" style={{ color }}>
        {guild.icon?.startsWith("data:") ? (
          <img src={guild.icon} alt="" className="h-6 w-6 object-contain" />
        ) : guild.icon || "⬡"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{guild.name}</p>
        {guild.description && (
          <p className="truncate text-xs text-gray">{guild.description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-gray">
        <span>{guild.memberCount ?? guild.members.length}</span>
        {guild.admission === "closed" && <Lock className="h-3 w-3" />}
        {isMember && <ChevronRight className="h-3.5 w-3.5" />}
      </div>
    </div>
  )

  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>
}
