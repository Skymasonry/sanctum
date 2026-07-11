"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MessageCircle, Calendar, ChevronRight, Flame, Video, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import type { User } from "@/lib/auth"
import type { Guild } from "@/types/guild"
import type { PulseEntry, GuildCalendarRef } from "@/app/page"
import { MyGuildsSection } from "@/components/home/MyGuildsSection"
import { DiscoverSection } from "@/components/home/DiscoverSection"
import { CreateGuildModal } from "@/components/home/CreateGuildModal"

interface UpcomingEvent {
  uid: string
  title: string
  start: string
  end: string | null
  guildId: string
  guildName: string
  guildColor: string
  guildIcon: string
}

interface HearthProps {
  user: User
  allGuilds: Guild[]
  userGuilds: Guild[]
  pulseEntries: PulseEntry[]
  guildCalendars: GuildCalendarRef[]
}

const NOW_SECONDS = Math.floor(new Date().getTime() / 1000)

function timeAgo(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(unixSeconds * 1000).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
}

function formatEventDate(start: string): { dayLabel: string; timeLabel: string; isToday: boolean; isTomorrow: boolean } {
  const date = new Date(start)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)

  const isToday = date.toDateString() === now.toDateString()
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  const dayLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
  const timeLabel = date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })

  return { dayLabel, timeLabel, isToday, isTomorrow }
}

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
}

export function Hearth({ user, allGuilds, userGuilds, pulseEntries, guildCalendars }: HearthProps) {
  const [events, setEvents] = useState<UpcomingEvent[] | null>(guildCalendars.length === 0 ? [] : null)
  const [showCreateGuild, setShowCreateGuild] = useState(false)
  const [guildTab, setGuildTab] = useState<"my" | "discover">("my")

  const username = user.username?.toLowerCase() || ""
  const otherGuilds = allGuilds.filter(
    (g) => !g.members.some((m) => m.toLowerCase() === username) && g.admission !== "mandatory"
  )
  const unreadByGuildId: Record<string, number> = {}
  for (const p of pulseEntries) {
    if (p.unreadMessages > 0) unreadByGuildId[p.guildId] = p.unreadMessages
  }

  useEffect(() => {
    if (guildCalendars.length === 0) return

    const from = new Date().toISOString().split("T")[0]
    const to = new Date(new Date().getTime() + 60 * 86400000).toISOString().split("T")[0]

    Promise.allSettled(
      guildCalendars.map(async (gc) => {
        const res = await fetch(`/api/calendar/${gc.calendarUri}/events?from=${from}&to=${to}`)
        if (!res.ok) return []
        const data = await res.json()
        return (Array.isArray(data) ? data : []).map((e: UpcomingEvent) => ({
          ...e,
          guildId: gc.guildId,
          guildName: gc.guildName,
          guildColor: gc.guildColor,
          guildIcon: gc.guildIcon,
        }))
      })
    ).then((results) => {
      const all: UpcomingEvent[] = []
      for (const r of results) {
        if (r.status === "fulfilled") all.push(...r.value)
      }
      all.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      setEvents(all)
    })
  }, [guildCalendars])

  const nowSeconds = NOW_SECONDS
  const activePulse = pulseEntries.filter((p) => (nowSeconds - p.lastActivity) / 3600 < 168)

  return (
    <div className="atmosphere flex h-full flex-col overflow-y-auto">

      {/* Welcome */}
      <div className="relative border-b border-gray-dark/50 px-6 pb-7 pt-8 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-gray">
            Per aspera ad astra
          </p>
          <h1 className="font-display text-3xl font-medium tracking-wide text-gold">
            {user.name || user.username}
          </h1>
          <p className="mt-1.5 text-sm text-gray-light">
            {greeting()}
          </p>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gold/[0.03] to-transparent" />
      </div>

      {/* Main content — constrained width */}
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-8 lg:px-8">

        {/* Top row: Next Gathering + Live Chambers */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          {/* Next Gathering — wider */}
          <div className="sm:col-span-3">
            <SectionLabel icon={<Calendar className="h-4 w-4" />} title="Next Gathering" />
            {events === null ? (
              <p className="py-4 text-sm italic text-gray">Reading the stars…</p>
            ) : events.length > 0 ? (
              <NextGathering event={events[0]} moreEvents={events.slice(1)} />
            ) : (
              <QuietState message="No gatherings foretold in the coming days." />
            )}
          </div>

          {/* Live Chambers — narrower */}
          <div className="sm:col-span-2">
            <SectionLabel icon={<Video className="h-4 w-4" />} title="Chambers" />
            <LiveChambers guilds={userGuilds} />
          </div>
        </div>

        {/* The Chat */}
        <div>
          <SectionLabel icon={<Flame className="h-4 w-4" />} title="The Chat" subtitle="Where conversation is alive" />
          {activePulse.length === 0 ? (
            <QuietState message="The hearth is quiet this morning." />
          ) : (
            <motion.div
              variants={stagger.container}
              initial="hidden"
              animate="show"
              className="space-y-1"
            >
              {activePulse.map((entry) => (
                <PulseRow key={entry.guildId} entry={entry} nowSeconds={nowSeconds} />
              ))}
            </motion.div>
          )}
        </div>

        {/* Guilds */}
        <div>
          <div className="mb-5 flex items-center justify-between">
            <SectionLabel title="Guilds" />
            <button
              onClick={() => setShowCreateGuild(true)}
              className="text-xs text-gray transition-colors hover:text-white"
            >
              + Seed guild
            </button>
          </div>

          <div className="mb-4 flex gap-4 border-b border-gray-dark/50">
            {(["my", "discover"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setGuildTab(t)}
                className={cn(
                  "relative pb-3 text-xs font-medium uppercase tracking-wider transition-colors",
                  guildTab === t ? "text-gold" : "text-gray hover:text-white"
                )}
              >
                {t === "my" ? `My Guilds (${userGuilds.length})` : `Discover (${otherGuilds.length})`}
                {guildTab === t && <span className="absolute bottom-0 left-0 right-0 h-px bg-gold" />}
              </button>
            ))}
          </div>

          {guildTab === "my" ? (
            <MyGuildsSection guilds={userGuilds} username={username} search="" unreadByGuildId={unreadByGuildId} />
          ) : (
            <DiscoverSection guilds={otherGuilds} username={username} search="" />
          )}
        </div>

      </div>

      {showCreateGuild && <CreateGuildModal onClose={() => setShowCreateGuild(false)} />}
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return "The night is still."
  if (h < 12) return "The hearth is warm this morning."
  if (h < 17) return "The hall is open."
  if (h < 21) return "Evening light in the sanctum."
  return "The brothers gather in the quiet hours."
}

function SectionLabel({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      {icon && <span className="text-gold/70">{icon}</span>}
      <div>
        <h2 className="font-display text-base font-medium tracking-wide text-white">{title}</h2>
        {subtitle && <p className="text-xs uppercase tracking-widest text-gray">{subtitle}</p>}
      </div>
    </div>
  )
}

function QuietState({ message }: { message: string }) {
  return <p className="py-2 text-sm italic text-gray">{message}</p>
}

function NextGathering({ event, moreEvents }: { event: UpcomingEvent; moreEvents: UpcomingEvent[] }) {
  const [expanded, setExpanded] = useState(false)
  const { dayLabel, timeLabel, isToday } = formatEventDate(event.start)
  const color = event.guildColor || "#c9a227"
  const remaining = moreEvents.length

  return (
    <div className="overflow-hidden rounded-xl border border-gray-dark bg-black-light/60">
      <Link
        href={`/guild/${event.guildId}/rites`}
        className="group flex items-center gap-4 px-4 py-4 transition-all hover:bg-black-light"
      >
        {/* Date block */}
        <div className="flex min-w-[44px] flex-col items-center text-center">
          <span className={cn("text-[9px] font-medium uppercase tracking-widest", isToday ? "text-gold" : "text-gray")}>
            {dayLabel.split(" ")[0]}
          </span>
          <span className={cn("font-display text-2xl font-medium leading-tight", isToday ? "text-gold" : "text-white")}>
            {new Date(event.start).getDate()}
          </span>
          <span className="text-[9px] text-gray">
            {new Date(event.start).toLocaleDateString("en-AU", { month: "short" })}
          </span>
        </div>

        <div className="h-10 w-px shrink-0 bg-gray-dark" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white transition-colors group-hover:text-gold">{event.title}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray">
            <span>{timeLabel}</span>
            <span>·</span>
            <span style={{ color }}>{event.guildName}</span>
          </div>
        </div>

        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray transition-transform group-hover:translate-x-0.5" />
      </Link>

      {/* "N more" toggle */}
      {remaining > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center gap-1.5 border-t border-gray-dark/60 px-4 py-2 text-left text-xs text-gray transition-colors hover:text-white"
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
            {expanded ? "Hide" : `+${remaining} more`} coming up
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border-t border-gray-dark/40 py-1">
                  {moreEvents.slice(0, 5).map((e) => (
                    <UpcomingEventRow key={`${e.guildId}-${e.uid}`} event={e} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

function UpcomingEventRow({ event }: { event: UpcomingEvent }) {
  const { dayLabel, timeLabel, isToday } = formatEventDate(event.start)
  const color = event.guildColor || "#c9a227"

  return (
    <Link
      href={`/guild/${event.guildId}/rites`}
      className="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-black-light"
    >
      <span className={cn("w-16 shrink-0 text-xs", isToday ? "text-gold" : "text-gray")}>{dayLabel}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-white transition-colors group-hover:text-gold">{event.title}</span>
      <span className="shrink-0 text-[10px]" style={{ color }}>{event.guildName}</span>
      <span className="shrink-0 text-[10px] text-gray">{timeLabel}</span>
    </Link>
  )
}

function LiveChambers({ guilds }: { guilds: Guild[] }) {
  if (guilds.length === 0) {
    return <QuietState message="No guilds joined yet." />
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-dark bg-black-light/60">
      {guilds.map((guild, i) => {
        const color = guild.color || "#c9a227"
        const chamberUrl = `https://meet.talitamoss.info/${guild.id}`

        return (
          <a
            key={guild.id}
            href={chamberUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black-light",
              i > 0 && "border-t border-gray-dark/50"
            )}
          >
            <div className="shrink-0 text-lg" style={{ color }}>
              {guild.icon?.startsWith("data:") ? (
                <img src={guild.icon} alt="" className="h-5 w-5 object-contain" />
              ) : guild.icon || "⬡"}
            </div>
            <span className="min-w-0 flex-1 truncate text-xs text-gray-light group-hover:text-white transition-colors">
              {guild.name}
            </span>
            <Video className="h-3.5 w-3.5 shrink-0 text-gray transition-colors group-hover:text-gold" />
          </a>
        )
      })}
    </div>
  )
}

function PulseRow({ entry, nowSeconds }: { entry: PulseEntry; nowSeconds: number }) {
  const color = entry.guildColor || "#c9a227"
  const ago = timeAgo(entry.lastActivity)
  const isWarm = (nowSeconds - entry.lastActivity) < 3600

  return (
    <motion.div variants={stagger.item}>
      <Link
        href={`/guild/${entry.guildId}/pulse`}
        className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-black-light"
      >
        <div className="shrink-0 text-xl" style={{ color }}>
          {entry.guildIcon?.startsWith("data:") ? (
            <img src={entry.guildIcon} alt="" className="h-5 w-5 object-contain" />
          ) : entry.guildIcon || "⬡"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{entry.guildName}</span>
            {isWarm && <span className="h-1.5 w-1.5 rounded-full bg-gold/80" />}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray">
            <MessageCircle className="h-3 w-3" />
            <span>{ago}</span>
          </div>
        </div>

        {entry.unreadMessages > 0 && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-black"
            style={{ backgroundColor: color }}
          >
            {entry.unreadMessages > 99 ? "99+" : entry.unreadMessages}
          </span>
        )}

        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  )
}
