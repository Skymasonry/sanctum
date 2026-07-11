"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Calendar, Shield, Loader2, Search, Sparkles, ChevronDown, ChevronUp, ChevronRight
} from "lucide-react"
import type { Guild } from "@/types/guild"
import type { User } from "@/lib/auth"
import type { TalkRoom } from "@/lib/talk"
import { MyGuildsSection } from "./MyGuildsSection"
import { CreateGuildModal } from "./CreateGuildModal"
import { DiscoverSection } from "./DiscoverSection"

interface GuildCalendar {
  guildId: string
  guildName: string
  guildColor: string
  guildIcon: string
  calendarUri: string
}

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

interface HomePageProps {
  user: User
  allGuilds: Guild[]
  userGuilds: Guild[]
  guildCalendars: GuildCalendar[]
}

export function HomePage({ user, allGuilds, userGuilds, guildCalendars }: HomePageProps) {
  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [showAllEvents, setShowAllEvents] = useState(false)
  const [unreadByGuildId, setUnreadByGuildId] = useState<Record<string, number>>({})
  const [showCreateGuild, setShowCreateGuild] = useState(false)
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<"my" | "discover">("my")

  const username = user.username?.toLowerCase() || ""

  useEffect(() => {
    async function loadEvents() {
      setLoadingEvents(true)
      const now = new Date()
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const from = now.toISOString().split("T")[0]
      const to = in30Days.toISOString().split("T")[0]

      const results = await Promise.allSettled(
        guildCalendars.map(async (gc) => {
          const res = await fetch(`/api/calendar/${gc.calendarUri}/events?from=${from}&to=${to}`)
          if (!res.ok) return []
          const data = await res.json()
          return (Array.isArray(data) ? data : []).map((e: any) => ({
            ...e,
            guildId: gc.guildId,
            guildName: gc.guildName,
            guildColor: gc.guildColor,
            guildIcon: gc.guildIcon,
          }))
        })
      )

      const allEvents: UpcomingEvent[] = []
      for (const r of results) {
        if (r.status === "fulfilled") allEvents.push(...r.value)
      }

      allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      setEvents(allEvents)
      setLoadingEvents(false)
    }

    if (guildCalendars.length > 0) {
      loadEvents()
    } else {
      setLoadingEvents(false)
    }
  }, [guildCalendars])

  useEffect(() => {
    const tokenToGuildId: Record<string, string> = {}
    for (const guild of userGuilds) {
      if (guild.resources.talkRoom) {
        tokenToGuildId[guild.resources.talkRoom] = guild.id
      }
    }

    if (Object.keys(tokenToGuildId).length === 0) return

    fetch("/api/talk/rooms")
      .then((r) => r.ok ? r.json() : [])
      .then((rooms: TalkRoom[]) => {
        const map: Record<string, number> = {}
        for (const room of rooms) {
          const guildId = tokenToGuildId[room.token]
          if (guildId && room.unreadMessages > 0) {
            map[guildId] = room.unreadMessages
          }
        }
        setUnreadByGuildId(map)
      })
      .catch(() => {})
  }, [userGuilds])

  const otherGuilds = allGuilds.filter(
    (g) => !g.members.some((m) => m.toLowerCase() === username) && g.admission !== "mandatory"
  )

  return (
    <div className="atmosphere flex h-full flex-col overflow-y-auto">
      {/* Hero welcome */}
      <div className="relative border-b border-gray-dark/50 px-6 pb-8 pt-8 lg:px-8">
        <div className="relative z-10">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-gray">
            Per aspera ad astra
          </p>
          <h1 className="font-display text-3xl font-medium tracking-wide text-gold">
            Welcome, {user.name || user.username}
          </h1>
          <p className="mt-2 text-sm text-gray-light">The Sanctum awaits your counsel</p>
        </div>
        {/* Subtle gold gradient wash */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gold/[0.03] to-transparent" />
      </div>

      <div className="flex-1 space-y-0 px-6 lg:px-8">
        {/* Upcoming Rites */}
        <section className="py-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10">
              <Calendar className="h-4 w-4 text-gold" />
            </div>
            <div>
              <h2 className="font-display text-lg font-medium tracking-wide text-white">
                Upcoming Rites
              </h2>
              <p className="text-xs uppercase tracking-widest text-gray">Across all your guilds</p>
            </div>
          </div>
          {loadingEvents ? (
            <div className="flex items-center gap-2 py-6 text-sm text-gray">
              <Loader2 className="h-4 w-4 animate-spin" /> Consulting the stars...
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-dark/70 py-8 text-center">
              <Calendar className="mx-auto mb-2 h-6 w-6 text-gray-dark" />
              <p className="text-sm italic text-gray">No rites foretold in the coming days</p>
            </div>
          ) : (
            <div className="space-y-3">
              <NextEventCard event={events[0]} />
              {events.length > 1 && (
                <button
                  onClick={() => setShowAllEvents((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-gray transition-colors hover:text-white"
                >
                  {showAllEvents ? (
                    <><ChevronUp className="h-3.5 w-3.5" /> Hide</>
                  ) : (
                    <><ChevronDown className="h-3.5 w-3.5" /> {events.length - 1} more upcoming</>
                  )}
                </button>
              )}
              {showAllEvents && (
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {events.slice(1).map((event) => (
                    <EventCard key={`${event.guildId}-${event.uid}`} event={event} />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Divider */}
        <div className="glow-line relative h-px" />

        {/* Guilds */}
        <section className="py-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10">
                <Shield className="h-4 w-4 text-gold" />
              </div>
              <div>
                <h2 className="font-display text-base font-medium tracking-wide text-white">
                  The Guilds
                </h2>
                <p className="text-xs uppercase tracking-widest text-gray">Brotherhoods of the order</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateGuild(true)}
              className="group inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/5 px-3.5 py-2 text-xs font-medium text-gold transition-all hover:border-gold/60 hover:bg-gold/10"
            >
              <Sparkles className="h-3.5 w-3.5 transition-transform group-hover:rotate-12" />
              Seed Guild
            </button>
          </div>

          {/* Tabs */}
          <div className="mb-4 flex items-center gap-4 border-b border-gray-dark/50">
            <button
              onClick={() => setTab("my")}
              className={`relative pb-3 text-xs font-medium tracking-wider transition-colors ${
                tab === "my" ? "text-gold" : "text-gray hover:text-white"
              }`}
            >
              MY GUILDS
              <span className="ml-1.5 text-[10px] text-gray">({userGuilds.length})</span>
              {tab === "my" && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-gold" />
              )}
            </button>
            <button
              onClick={() => setTab("discover")}
              className={`relative pb-3 text-xs font-medium tracking-wider transition-colors ${
                tab === "discover" ? "text-gold" : "text-gray hover:text-white"
              }`}
            >
              DISCOVER
              <span className="ml-1.5 text-[10px] text-gray">({otherGuilds.length})</span>
              {tab === "discover" && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-gold" />
              )}
            </button>
            {/* Search aligned right */}
            <div className="ml-auto pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-36 rounded border border-gray-dark/50 bg-transparent py-1 pl-7 pr-2 text-[11px] text-white placeholder:text-gray focus:border-gold/50 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tab content */}
          {tab === "my" ? (
            <MyGuildsSection guilds={userGuilds} username={username} search={search} unreadByGuildId={unreadByGuildId} />
          ) : (
            <DiscoverSection guilds={otherGuilds} username={username} search={search} />
          )}
        </section>
      </div>

      {/* Create Guild Modal */}
      {showCreateGuild && (
        <CreateGuildModal onClose={() => setShowCreateGuild(false)} />
      )}
    </div>
  )
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const diff = target.getTime() - now.getTime()
  if (diff <= 0) return null

  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  const remMinutes = minutes % 60

  if (days > 0) return `${days}d ${remHours}h`
  if (hours > 0) return `${hours}h ${remMinutes}m`
  return `${remMinutes}m`
}

function NextEventCard({ event }: { event: UpcomingEvent }) {
  const date = new Date(event.start)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  const dayLabel = isToday
    ? "Today"
    : isTomorrow
    ? "Tomorrow"
    : date.toLocaleDateString("en-AU", { weekday: "short" })

  const dateNum = date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
  const timeLabel = date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
  const guildColor = event.guildColor || "#c9a227"

  return (
    <Link
      href={`/guild/${event.guildId}/rites`}
      className="group flex items-center gap-4 rounded-lg border border-gray-dark bg-black-light/50 px-5 py-4 transition-all hover:border-gray hover:bg-black-light"
    >
      {/* Date column */}
      <div className="flex min-w-[52px] flex-col items-center text-center">
        <span className={`text-[10px] font-medium uppercase tracking-widest ${isToday ? "text-gold" : "text-gray"}`}>
          {dayLabel}
        </span>
        <span className={`font-display text-xl font-medium leading-tight ${isToday ? "text-gold" : "text-white"}`}>
          {date.getDate()}
        </span>
        <span className="text-[10px] text-gray">{dateNum.split(" ")[1]}</span>
      </div>

      {/* Divider */}
      <div className="h-10 w-px shrink-0 bg-gray-dark" />

      {/* Event info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white group-hover:text-gold">
          {event.title}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-[11px] text-gray">{timeLabel}</span>
          <span className="text-[11px] text-gray">·</span>
          <span className="text-[11px] font-medium" style={{ color: guildColor }}>
            {event.guildName}
          </span>
        </div>
      </div>

      {/* Guild icon */}
      <div className="shrink-0 text-2xl" style={{ color: guildColor }}>
        {event.guildIcon?.startsWith("data:") ? (
          <img src={event.guildIcon} alt="" className="h-7 w-7 object-contain" />
        ) : (
          event.guildIcon || "⬡"
        )}
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-gray transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

function EventCard({ event }: { event: UpcomingEvent }) {
  const date = new Date(event.start)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  const dayLabel = isToday
    ? "Today"
    : isTomorrow
    ? "Tomorrow"
    : date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric" })

  const timeLabel = date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })

  const guildColor = event.guildColor || "#c9a227"

  return (
    <Link
      href={`/guild/${event.guildId}/rites`}
      className="group flex shrink-0 flex-col items-center rounded-lg border border-gray-dark bg-black-light/50 px-4 py-4 transition-all hover:border-gray hover:bg-black-light"
    >
      <div
        className="mb-2.5 text-3xl"
        style={{ color: guildColor }}
      >
        {event.guildIcon?.startsWith("data:") ? (
          <img src={event.guildIcon} alt="" className="h-8 w-8 object-contain" />
        ) : (
          event.guildIcon || "\u2B21"
        )}
      </div>
      <span className={`text-xs font-medium ${isToday ? "text-gold" : "text-white"}`}>
        {dayLabel}
      </span>
      <span className="text-[11px] text-gray">
        {timeLabel}
      </span>
    </Link>
  )
}
