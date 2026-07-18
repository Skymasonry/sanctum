"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Calendar, Shield, Loader2, Search, Sparkles, ChevronDown, ChevronUp, ChevronRight, MessageSquare,
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
  const [lastActivityByGuildId, setLastActivityByGuildId] = useState<Record<string, number>>({})
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
        const unread: Record<string, number> = {}
        const activity: Record<string, number> = {}
        for (const room of rooms) {
          const guildId = tokenToGuildId[room.token]
          if (guildId) {
            if (room.unreadMessages > 0) unread[guildId] = room.unreadMessages
            activity[guildId] = room.lastActivity
          }
        }
        setUnreadByGuildId(unread)
        setLastActivityByGuildId(activity)
      })
      .catch(() => {})
  }, [userGuilds])

  const otherGuilds = allGuilds.filter(
    (g) => !g.members.some((m) => m.toLowerCase() === username) && g.admission !== "mandatory"
  )

  const visibleEvents = showAllEvents ? events : events.slice(0, 5)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Welcome bar */}
      <div className="shrink-0 border-b border-white/05 px-8 py-5">
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-[0.25em] text-gold/50">
          Per aspera ad astra
        </p>
        <h1 className="font-display text-2xl font-medium tracking-wide" style={{ color: "pink" }}>
          The Hearth
        </h1>
      </div>

      {/* Two-column body */}
      <div className="flex flex-1 gap-0 overflow-hidden">

        {/* Main column */}
        <div className="custom-scrollbar flex-1 overflow-y-auto px-8 py-6">
          <p className="mb-6 text-sm text-gray-light">
            Welcome back, <span className="text-white">{user.name || user.username}</span>
          </p>

          {/* The Pulse — recent chats */}
          {userGuilds.some((g) => g.resources.talkRoom) && (
            <section className="mb-8">
              <div className="mb-3 flex items-center gap-2.5">
                <MessageSquare className="h-4 w-4 text-gold/70" />
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gold/70">
                  The Pulse
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {userGuilds
                  .filter((g) => g.resources.talkRoom)
                  .sort((a, b) => (lastActivityByGuildId[b.id] || 0) - (lastActivityByGuildId[a.id] || 0))
                  .map((guild) => {
                    const unread = unreadByGuildId[guild.id] || 0
                    const lastActivity = lastActivityByGuildId[guild.id]
                    const ago = lastActivity ? formatAgo(lastActivity) : null
                    return (
                      <Link
                        key={guild.id}
                        href={`/guild/${guild.id}/pulse`}
                        className="group flex items-center gap-2.5 rounded-xl border border-white/06 bg-white/02 px-3.5 py-2.5 transition-all hover:border-white/12 hover:bg-white/05"
                      >
                        <span className="text-base leading-none"
                          style={{ color: guild.color }}
                        >
                          {guild.icon?.startsWith("data:") ? (
                            <img src={guild.icon} alt="" className="h-5 w-5 object-contain" />
                          ) : guild.icon || "⬡"}
                        </span>
                        <div>
                          <p className="text-xs font-medium text-white/80 group-hover:text-white">
                            {guild.name}
                          </p>
                          {ago && (
                            <p className="text-[10px] text-gray/60">{ago}</p>
                          )}
                        </div>
                        {unread > 0 && (
                          <span
                            className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-black"
                            style={{ backgroundColor: guild.color }}
                          >
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </Link>
                    )
                  })}
              </div>
            </section>
          )}

          {/* Guilds */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="h-4 w-4 text-gold/70" />
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gold/70">
                  The Guilds
                </h2>
              </div>
              <button
                onClick={() => setShowCreateGuild(true)}
                className="group inline-flex items-center gap-1.5 rounded-lg border border-gold/20 bg-gold/05 px-3 py-1.5 text-[11px] font-medium text-gold/70 transition-all hover:border-gold/40 hover:bg-gold/10 hover:text-gold"
              >
                <Sparkles className="h-3 w-3 transition-transform group-hover:rotate-12" />
                Seed Guild
              </button>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex items-center gap-4 border-b border-white/06">
              <button
                onClick={() => setTab("my")}
                className={`relative pb-2.5 text-[11px] font-medium uppercase tracking-widest transition-colors ${
                  tab === "my" ? "text-gold" : "text-gray hover:text-white"
                }`}
              >
                My Guilds
                <span className="ml-1 text-[10px] opacity-60">({userGuilds.length})</span>
                {tab === "my" && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-gold" />
                )}
              </button>
              <button
                onClick={() => setTab("discover")}
                className={`relative pb-2.5 text-[11px] font-medium uppercase tracking-widest transition-colors ${
                  tab === "discover" ? "text-gold" : "text-gray hover:text-white"
                }`}
              >
                Discover
                <span className="ml-1 text-[10px] opacity-60">({otherGuilds.length})</span>
                {tab === "discover" && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-gold" />
                )}
              </button>
              <div className="ml-auto pb-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray/60" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-32 rounded-lg border border-white/08 bg-white/04 py-1 pl-7 pr-2 text-[11px] text-white placeholder:text-gray/50 focus:border-gold/30 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {tab === "my" ? (
              <MyGuildsSection guilds={userGuilds} username={username} search={search} unreadByGuildId={unreadByGuildId} />
            ) : (
              <DiscoverSection guilds={otherGuilds} username={username} search={search} />
            )}
          </section>
        </div>

        {/* Right panel — events */}
        <div className="custom-scrollbar w-72 shrink-0 overflow-y-auto border-l border-white/05 px-5 py-6">
          <div className="mb-4 flex items-center gap-2.5">
            <Calendar className="h-4 w-4 text-gold/70" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gold/70">
              Upcoming Rites
            </h2>
          </div>

          {loadingEvents ? (
            <div className="flex items-center gap-2 py-4 text-xs text-gray">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Consulting the stars…
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/08 py-6 text-center">
              <p className="text-xs italic text-gray/70">No rites foretold in the coming days</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {visibleEvents.map((event) => (
                <EventRow key={`${event.guildId}-${event.uid}`} event={event} />
              ))}
              {events.length > 5 && (
                <button
                  onClick={() => setShowAllEvents((v) => !v)}
                  className="flex w-full items-center justify-center gap-1 pt-2 text-[11px] text-gray transition-colors hover:text-white"
                >
                  {showAllEvents ? (
                    <><ChevronUp className="h-3 w-3" /> Show less</>
                  ) : (
                    <><ChevronDown className="h-3 w-3" /> {events.length - 5} more</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showCreateGuild && (
        <CreateGuildModal onClose={() => setShowCreateGuild(false)} />
      )}
    </div>
  )
}

function formatAgo(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function EventRow({ event }: { event: UpcomingEvent }) {
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
    : date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })

  const timeLabel = date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
  const guildColor = event.guildColor || "#c9a227"

  return (
    <Link
      href={`/guild/${event.guildId}/rites`}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/04"
    >
      {/* Color pip */}
      <div className="h-8 w-0.5 shrink-0 rounded-full" style={{ backgroundColor: guildColor }} />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-white/90 group-hover:text-white">
          {event.title}
        </p>
        <p className="text-[10px] text-gray/70">
          {isToday || isTomorrow ? (
            <><span className={isToday ? "text-gold/80" : ""}>{dayLabel}</span> · {timeLabel}</>
          ) : (
            <>{dayLabel} · {timeLabel}</>
          )}
        </p>
      </div>

      <ChevronRight className="h-3 w-3 shrink-0 text-gray/40 transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
