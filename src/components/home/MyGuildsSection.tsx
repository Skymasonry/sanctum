"use client"

import { useMemo } from "react"
import { Star, Shield } from "lucide-react"
import { useLocalStorage } from "@/lib/hooks/useLocalStorage"
import { GuildTile } from "./GuildTile"
import { CategoryGroup } from "./CategoryGroup"
import type { Guild } from "@/types/guild"

interface MyGuildsSectionProps {
  guilds: Guild[]
  username: string
  search: string
  unreadByGuildId?: Record<string, number>
}

export function MyGuildsSection({ guilds, username, search, unreadByGuildId = {} }: MyGuildsSectionProps) {
  const [pinnedIds, setPinnedIds] = useLocalStorage<string[]>("sanctum-pinned-guilds", [])
  const [collapsedCategories, setCollapsedCategories] = useLocalStorage<string[]>("sanctum-collapsed-categories", [])

  const togglePin = (guildId: string) => {
    setPinnedIds((prev) =>
      prev.includes(guildId) ? prev.filter((id) => id !== guildId) : [...prev, guildId]
    )
  }

  const toggleCollapse = (category: string) => {
    setCollapsedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }

  const filtered = useMemo(() => {
    if (!search) return guilds
    const q = search.toLowerCase()
    return guilds.filter((g) => g.name.toLowerCase().includes(q))
  }, [guilds, search])

  const { pinned, grouped } = useMemo(() => {
    const pinned = filtered.filter((g) => pinnedIds.includes(g.id))
    const unpinned = filtered.filter((g) => !pinnedIds.includes(g.id))

    const categoryMap = new Map<string, Guild[]>()
    const other: Guild[] = []

    for (const guild of unpinned) {
      if (guild.category) {
        const existing = categoryMap.get(guild.category) || []
        existing.push(guild)
        categoryMap.set(guild.category, existing)
      } else {
        other.push(guild)
      }
    }

    const sorted = Array.from(categoryMap.entries()).sort(([a], [b]) => a.localeCompare(b))
    if (other.length > 0) {
      sorted.push(["Other", other])
    }

    return { pinned, grouped: sorted }
  }, [filtered, pinnedIds])

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-dark/70 py-10 text-center">
        <Shield className="mx-auto mb-2 h-6 w-6 text-gray-dark" />
        <p className="text-sm italic text-gray">
          {search ? "No guilds match your search" : "You have not yet pledged to any guild"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pinned */}
      {pinned.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-gold" fill="currentColor" />
            <span className="font-display text-xs font-medium uppercase tracking-widest text-gold">
              Pinned
            </span>
            <span className="rounded bg-gold/10 px-1.5 py-0.5 text-[10px] text-gold-dim">
              {pinned.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {pinned.map((guild) => (
              <GuildTile
                key={guild.id}
                guild={guild}
                username={username}
                isMember={true}
                isPinned={true}
                onTogglePin={togglePin}
                unreadCount={unreadByGuildId[guild.id] ?? 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category groups */}
      {grouped.map(([category, categoryGuilds]) => (
        <CategoryGroup
          key={category}
          title={category}
          count={categoryGuilds.length}
          isCollapsed={collapsedCategories.includes(category)}
          onToggleCollapse={() => toggleCollapse(category)}
        >
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {categoryGuilds.map((guild) => (
              <GuildTile
                key={guild.id}
                guild={guild}
                username={username}
                isMember={true}
                isPinned={pinnedIds.includes(guild.id)}
                onTogglePin={togglePin}
                unreadCount={unreadByGuildId[guild.id] ?? 0}
              />
            ))}
          </div>
        </CategoryGroup>
      ))}
    </div>
  )
}
