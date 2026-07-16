"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, Lock } from "lucide-react"

import { GuildIcon } from "@/components/shared"
import type { Guild } from "@/types/guild"

import { GuildDetailsModal } from "./GuildDetailsModal"

interface GuildListRowProps {
  guild: Guild
  username: string
  isMember: boolean
}

export function GuildListRow({ guild, username, isMember }: GuildListRowProps) {
  const router = useRouter()
  const color = guild.color || "#c9a227"
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [acting, setActing] = useState(false)
  const [actionResult, setActionResult] = useState<string | null>(null)
  const isPending = guild.pending?.some(p => p.toLowerCase() === username.toLowerCase())

  const handleAction = async (action: "join" | "apply") => {
    setActing(true)
    try {
      const res = await fetch(`/api/guilds/${guild.id}?action=${action}`, { method: "POST" })
      if (!res.ok) throw new Error()
      setActionResult(action === "join" ? "Joined!" : "Applied!")
      if (action === "join") router.refresh()
    } catch {
      setActionResult("Failed")
    } finally {
      setActing(false)
    }
  }

  const inner = (
    <div className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-black-light">
      <div className="shrink-0 text-xl">
        <GuildIcon icon={guild.icon} color={color} className="h-6 w-6 object-contain" />
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

  if (isMember) {
    return <Link href={`/guild/${guild.id}`}>{inner}</Link>
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDetailsOpen(true)}
        className="block w-full text-left"
      >
        {inner}
      </button>
      {detailsOpen && (
        <GuildDetailsModal
          guild={guild}
          onClose={() => setDetailsOpen(false)}
          onAction={handleAction}
          acting={acting}
          actionResult={actionResult}
          isPending={isPending}
        />
      )}
    </>
  )
}
