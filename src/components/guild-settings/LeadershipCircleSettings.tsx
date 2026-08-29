"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"

import { UserPicker } from "@/components/shared"

interface LeadershipCircleSettingsProps {
  guildId: string
  members: string[]
}

/**
 * Manager-only (seeder/steward — enforced by the API): the circle
 * doesn't self-govern the way stewards do.
 */
export function LeadershipCircleSettings({ guildId, members }: LeadershipCircleSettingsProps) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const add = (userId: string) => {
    start(async () => {
      await fetch(`/api/guilds/${guildId}/leadership-circle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      router.refresh()
    })
  }

  const remove = (userId: string) => {
    start(async () => {
      await fetch(`/api/guilds/${guildId}/leadership-circle`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      router.refresh()
    })
  }

  return (
    <div className={pending ? "opacity-60" : undefined}>
      <UserPicker
        picked={members}
        onAdd={add}
        onRemove={remove}
        placeholder="Name a Mason for this circle…"
      />
    </div>
  )
}
