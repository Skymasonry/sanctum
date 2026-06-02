"use client"

import { useState } from "react"
import Link from "next/link"
import { Star } from "lucide-react"
import type { Guild } from "@/types/guild"

interface GuildTileProps {
  guild: Guild
  username: string
  isMember: boolean
  isPinned?: boolean
  onTogglePin?: (guildId: string) => void
  unreadCount?: number
}

export function GuildTile({ guild, username, isMember, isPinned, onTogglePin, unreadCount = 0 }: GuildTileProps) {
  const [acting, setActing] = useState(false)
  const [actionResult, setActionResult] = useState<string | null>(null)
  const isPending = guild.pending?.some((p) => p.toLowerCase() === username)

  const handleAction = async (action: string) => {
    setActing(true)
    try {
      const res = await fetch(`/api/guilds/${guild.id}?action=${action}`, { method: "POST" })
      if (!res.ok) throw new Error()
      setActionResult(action === "join" ? "Joined!" : action === "apply" ? "Applied!" : "Left")
    } catch {
      setActionResult("Failed")
    } finally {
      setActing(false)
    }
  }

  const guildColor = guild.color || "#c9a227"

  const cardContent = (
    <div className="flex flex-col items-center px-3 py-5">
      {/* Unread badge */}
      {isMember && unreadCount > 0 && (
        <span className="absolute left-1.5 top-1.5 z-20 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}

      {/* Pin star */}
      {onTogglePin && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onTogglePin(guild.id)
          }}
          className={`absolute right-1.5 top-1.5 z-20 rounded p-1 transition-colors ${
            isPinned
              ? "text-gold hover:text-gold-dim"
              : "text-transparent group-hover:text-gray-dark hover:!text-gray"
          }`}
          aria-label={isPinned ? "Unpin guild" : "Pin guild"}
        >
          <Star className="h-3 w-3" fill={isPinned ? "currentColor" : "none"} />
        </button>
      )}

      {/* Emblem */}
      <div
        className="mb-3 text-5xl drop-shadow-lg"
        style={{ color: guildColor }}
      >
        {guild.icon?.startsWith("data:") ? (
          <img src={guild.icon} alt="" className="h-12 w-12 object-contain drop-shadow-lg" />
        ) : (
          guild.icon || "⬡"
        )}
      </div>

      {/* Name */}
      <h3
        className="text-center font-display text-xs font-semibold tracking-wide transition-colors group-hover:text-white"
        style={{ color: guildColor }}
      >
        {guild.name}
      </h3>

      {/* Non-member actions */}
      {!isMember && (
        <div className="mt-2">
          {actionResult ? (
            <span className="text-[10px] text-success">{actionResult}</span>
          ) : isPending ? (
            <span className="text-[10px] italic text-gold-dim">Pending</span>
          ) : guild.admission === "open" ? (
            <button
              onClick={(e) => { e.preventDefault(); handleAction("join") }}
              disabled={acting}
              className="text-[10px] font-medium text-gold hover:text-gold-dim disabled:opacity-50"
            >
              {acting ? "..." : "Join"}
            </button>
          ) : (
            <button
              onClick={(e) => { e.preventDefault(); handleAction("apply") }}
              disabled={acting}
              className="text-[10px] font-medium text-gold hover:text-gold-dim disabled:opacity-50"
            >
              {acting ? "..." : "Apply"}
            </button>
          )}
        </div>
      )}
    </div>
  )

  const wrapperClass = "group relative flex flex-col items-center overflow-hidden rounded-lg border border-gray-dark bg-black-light/50 transition-all hover:scale-105 hover:border-gray hover:bg-black-light"

  if (isMember) {
    return (
      <Link href={`/guild/${guild.id}`} className={wrapperClass}>
        {cardContent}
      </Link>
    )
  }

  return (
    <div className={wrapperClass}>
      {cardContent}
    </div>
  )
}
