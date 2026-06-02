"use client"

import type { Guild } from "@/types/guild"

interface GuildThresholdClientProps {
  guild: Guild
  isSeeder: boolean
  children: React.ReactNode
}

export function GuildThresholdClient({ children }: GuildThresholdClientProps) {
  return <>{children}</>
}
