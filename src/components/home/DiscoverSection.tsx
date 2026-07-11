"use client"

import { useState, useMemo } from "react"
import { LayoutGrid, List, Shield } from "lucide-react"
import { GuildTile } from "./GuildTile"
import { GuildListRow } from "./GuildListRow"
import { CategoryChips } from "./CategoryChips"
import { AlphabetIndex } from "./AlphabetIndex"
import type { Guild } from "@/types/guild"

type SortBy = "members" | "newest" | "az"

interface DiscoverSectionProps {
  guilds: Guild[]
  username: string
  search: string
}

export function DiscoverSection({ guilds, username, search }: DiscoverSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<SortBy>("members")

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const g of guilds) {
      const cat = g.category || "Other"
      counts.set(cat, (counts.get(cat) || 0) + 1)
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ name, count }))
  }, [guilds])

  const filtered = useMemo(() => {
    let result = guilds

    if (selectedCategory) {
      result = result.filter((g) =>
        selectedCategory === "Other" ? !g.category : g.category === selectedCategory
      )
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (g) => g.name.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q)
      )
    }

    switch (sortBy) {
      case "members":
        result = [...result].sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
        break
      case "newest":
        result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case "az":
        result = [...result].sort((a, b) => a.name.localeCompare(b.name))
        break
    }

    return result
  }, [guilds, selectedCategory, search, sortBy])

  // Group by first letter for A-Z index
  const { letterGroups, availableLetters } = useMemo(() => {
    const groups = new Map<string, Guild[]>()
    for (const g of filtered) {
      const letter = g.name[0]?.toUpperCase() || "#"
      const existing = groups.get(letter) || []
      existing.push(g)
      groups.set(letter, existing)
    }
    return {
      letterGroups: Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b)),
      availableLetters: new Set(groups.keys()),
    }
  }, [filtered])

  if (guilds.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-dark/70 py-10 text-center">
        <Shield className="mx-auto mb-2 h-6 w-6 text-gray-dark" />
        <p className="text-sm italic text-gray">All guilds have been claimed</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <CategoryChips categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-dark/50">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-l-lg p-1.5 transition-colors ${
                viewMode === "grid" ? "bg-gold/10 text-gold" : "text-gray hover:text-white"
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-r-lg border-l border-gray-dark/50 p-1.5 transition-colors ${
                viewMode === "list" ? "bg-gold/10 text-gold" : "text-gray hover:text-white"
              }`}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-lg border border-gray-dark/50 bg-transparent px-2 py-1 text-[11px] text-gray-light focus:border-gold/50 focus:outline-none"
          >
            <option value="members">Most members</option>
            <option value="newest">Newest</option>
            <option value="az">A-Z</option>
          </select>
        </div>
      </div>

      {/* Content with optional A-Z index */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-dark/70 py-10 text-center">
          <Shield className="mx-auto mb-2 h-6 w-6 text-gray-dark" />
          <p className="text-sm italic text-gray">No guilds match your filters</p>
        </div>
      ) : (
        <div className="flex gap-4">
          <div className="min-w-0 flex-1">
            {sortBy === "az" ? (
              // Render with letter anchors
              <div className="space-y-4">
                {letterGroups.map(([letter, letterGuilds]) => (
                  <div key={letter}>
                    <div id={`guild-letter-${letter}`} className="mb-2 text-[10px] font-medium uppercase tracking-widest text-gray">
                      {letter}
                    </div>
                    {viewMode === "grid" ? (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                        {letterGuilds.map((guild) => (
                          <GuildTile
                            key={guild.id}
                            guild={guild}
                            username={username}
                            isMember={guild.members.some((m) => m.toLowerCase() === username)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div>
                        {letterGuilds.map((guild) => (
                          <GuildListRow
                            key={guild.id}
                            guild={guild}
                            username={username}
                            isMember={guild.members.some((m) => m.toLowerCase() === username)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {filtered.map((guild) => (
                  <GuildTile
                    key={guild.id}
                    guild={guild}
                    username={username}
                    isMember={guild.members.some((m) => m.toLowerCase() === username)}
                  />
                ))}
              </div>
            ) : (
              <div>
                {filtered.map((guild) => (
                  <GuildListRow
                    key={guild.id}
                    guild={guild}
                    username={username}
                    isMember={guild.members.some((m) => m.toLowerCase() === username)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* A-Z index - only shown in A-Z sort mode */}
          {sortBy === "az" && <AlphabetIndex availableLetters={availableLetters} />}
        </div>
      )}
    </div>
  )
}
