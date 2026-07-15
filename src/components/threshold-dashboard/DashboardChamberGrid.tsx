"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Archive as ArchiveIcon,
  Calendar,
  FileText,
  MessageCircle,
  Target,
  Users,
  X,
} from "lucide-react"

import { EntryTile } from "@/components/threshold/EntryTile"
import { staggerContainer, staggerItem } from "@/components/shell"
import type { StirringGuild } from "@/types/threshold"

interface DashboardChamberGridProps {
  stirring: StirringGuild[]
}

interface ChamberDef {
  id: "pulse" | "rites" | "quests" | "archive" | "scrolls" | "brotherhood"
  icon: typeof MessageCircle
  title: string
  description: string
  countOf: (g: StirringGuild) => number
  chamberPath: string
  emptyLine: string
}

const CHAMBERS: ChamberDef[] = [
  {
    id: "pulse",
    icon: MessageCircle,
    title: "Chats",
    description: "New messages across your guilds",
    countOf: g => g.unreadMessages,
    chamberPath: "pulse",
    emptyLine: "No unread messages",
  },
  {
    id: "rites",
    icon: Calendar,
    title: "Rites",
    description: "Upcoming and changed events",
    countOf: g => g.eventChanges,
    chamberPath: "rites",
    emptyLine: "No new event activity",
  },
  {
    id: "quests",
    icon: Target,
    title: "Quests",
    description: "Assigned or overdue",
    countOf: () => 0, // aggregate not yet on /api/threshold
    chamberPath: "quests",
    emptyLine: "Cross-guild quest signal coming soon",
  },
  {
    id: "archive",
    icon: ArchiveIcon,
    title: "Archives",
    description: "Recently added files",
    countOf: g => g.newFiles,
    chamberPath: "archive",
    emptyLine: "No new files",
  },
  {
    id: "scrolls",
    icon: FileText,
    title: "Scrolls",
    description: "Surveys awaiting your response",
    countOf: () => 0,
    chamberPath: "scrolls",
    emptyLine: "No pending scrolls",
  },
  {
    id: "brotherhood",
    icon: Users,
    title: "Brothers",
    description: "Membership across guilds",
    countOf: () => 0,
    chamberPath: "brotherhood",
    emptyLine: "No membership activity",
  },
]

export function DashboardChamberGrid({ stirring }: DashboardChamberGridProps) {
  const [active, setActive] = useState<ChamberDef | null>(null)

  const totalFor = (c: ChamberDef) =>
    stirring.reduce((sum, g) => sum + c.countOf(g), 0)

  const guildsFor = (c: ChamberDef) =>
    stirring
      .map(g => ({ guild: g, count: c.countOf(g) }))
      .filter(x => x.count > 0)
      .sort((a, b) => b.count - a.count)

  return (
    <>
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {CHAMBERS.map(c => {
          const total = totalFor(c)
          return (
            <motion.div key={c.id} variants={staggerItem}>
              <button
                type="button"
                onClick={() => setActive(c)}
                className="block w-full text-left"
              >
                <EntryTile
                  // Non-navigating stub — the actual jump happens in the picker
                  href="#"
                  icon={c.icon}
                  title={c.title}
                  description={c.description}
                  badge={total > 0 ? total : undefined}
                />
              </button>
            </motion.div>
          )
        })}
      </motion.div>

      {active && (
        <ChamberPicker
          chamber={active}
          entries={guildsFor(active)}
          onClose={() => setActive(null)}
        />
      )}
    </>
  )
}

function ChamberPicker({
  chamber,
  entries,
  onClose,
}: {
  chamber: ChamberDef
  entries: { guild: StirringGuild; count: number }[]
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-gray-dark bg-black-deep p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-guild/15">
              <chamber.icon className="h-5 w-5 text-guild" />
            </div>
            <h2 className="font-display text-lg tracking-wide text-white">
              {chamber.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-faint">{chamber.emptyLine}</p>
        ) : (
          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {entries.map(({ guild, count }) => (
              <Link
                key={guild.guildId}
                href={`/guild/${guild.guildId}/${chamber.chamberPath}`}
                onClick={onClose}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-dark bg-black-light px-3 py-2.5 transition-colors hover:border-guild/50 hover:bg-guild/5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-xl">{guild.glyph}</span>
                  <span className="truncate text-sm font-medium text-white">
                    {guild.name}
                  </span>
                </div>
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-guild px-2 text-xs font-bold text-black-deep">
                  {count > 99 ? "99+" : count}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
