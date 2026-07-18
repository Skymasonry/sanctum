"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Calendar, Loader2, MessageSquare, ChevronRight, Video, Users } from "lucide-react"
import type { Guild } from "@/types/guild"
import type { User } from "@/lib/auth"
import type { TalkMessage, TalkRoom } from "@/lib/talk"
import { CreateGuildModal } from "./CreateGuildModal"

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

const CHAMBER_HREF = (guildId: string) => `https://meet.talitamoss.info/${guildId}`

export function HomePage({ user, allGuilds, userGuilds, guildCalendars }: HomePageProps) {
  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [openEventKey, setOpenEventKey] = useState<string | null>(null)
  const [showCreateGuild, setShowCreateGuild] = useState(false)

  const chatGuilds = userGuilds.filter((g) => g.resources.talkRoom)
  const [selectedChatId, setSelectedChatId] = useState<string>("")
  const [chatMessages, setChatMessages] = useState<Record<string, TalkMessage[]>>({})
  const [chatLoading, setChatLoading] = useState<string | null>(null)
  const [unreadByGuildId, setUnreadByGuildId] = useState<Record<string, number>>({})

  // Set default selected chat
  useEffect(() => {
    if (!selectedChatId && chatGuilds.length > 0) {
      setSelectedChatId(chatGuilds[0].id)
    }
  }, [chatGuilds])

  // Load events
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

    if (guildCalendars.length > 0) loadEvents()
    else setLoadingEvents(false)
  }, [guildCalendars])

  // Load unread counts
  useEffect(() => {
    if (chatGuilds.length === 0) return
    const tokenToGuildId: Record<string, string> = {}
    for (const guild of chatGuilds) {
      if (guild.resources.talkRoom) tokenToGuildId[guild.resources.talkRoom] = guild.id
    }
    fetch("/api/talk/rooms")
      .then((r) => r.ok ? r.json() : [])
      .then((rooms: TalkRoom[]) => {
        const unread: Record<string, number> = {}
        for (const room of rooms) {
          const guildId = tokenToGuildId[room.token]
          if (guildId && room.unreadMessages > 0) unread[guildId] = room.unreadMessages
        }
        setUnreadByGuildId(unread)
      })
      .catch(() => {})
  }, [userGuilds])

  // Load chat preview messages when tab changes
  useEffect(() => {
    if (!selectedChatId) return
    if (chatMessages[selectedChatId] !== undefined) return
    const guild = chatGuilds.find((g) => g.id === selectedChatId)
    if (!guild?.resources.talkRoom) return

    setChatLoading(selectedChatId)
    fetch(`/api/talk/${guild.resources.talkRoom}/messages?limit=3`)
      .then((r) => r.ok ? r.json() : [])
      .then((msgs: TalkMessage[]) => {
        setChatMessages((prev) => ({ ...prev, [selectedChatId]: Array.isArray(msgs) ? msgs.slice(-3) : [] }))
      })
      .catch(() => {
        setChatMessages((prev) => ({ ...prev, [selectedChatId]: [] }))
      })
      .finally(() => setChatLoading(null))
  }, [selectedChatId])

  const selectedGuild = chatGuilds.find((g) => g.id === selectedChatId)
  const selectedMessages = chatMessages[selectedChatId] ?? []
  const greeting = getGreeting()
  const firstName = user.name?.split(" ")[0] || user.username

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Welcome */}
      <div className="shrink-0 px-8 pt-7 pb-5">
        <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-gold/50">
          Per aspera ad astra
        </p>
        <h1 className="mb-1 font-display text-[26px] font-normal tracking-[0.05em] text-gold/85">
          The Hearth
        </h1>
        <p className="text-base font-light text-white/45">
          {greeting}, {firstName}.
        </p>
      </div>

      <div className="mx-8 mb-5 h-px shrink-0 bg-white/07" />

      {/* Body */}
      <div className="flex flex-1 gap-0 overflow-hidden">

        {/* Main column */}
        <div className="custom-scrollbar flex-1 overflow-y-auto px-8 pb-8">

          {/* The Chat */}
          {chatGuilds.length > 0 && (
            <section className="mb-5">
              <div className="mb-2.5 flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3 text-white/30" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                  The Chat
                </span>
              </div>

              {/* Guild tabs */}
              <div className="mb-3 flex flex-wrap gap-1.5">
                {chatGuilds.map((guild) => {
                  const unread = unreadByGuildId[guild.id] ?? 0
                  const isActive = selectedChatId === guild.id
                  return (
                    <button
                      key={guild.id}
                      onClick={() => setSelectedChatId(guild.id)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${
                        isActive
                          ? "border border-white/10 bg-white/08 text-white/90"
                          : "border border-transparent text-white/35 hover:bg-white/05 hover:text-white/65"
                      }`}
                    >
                      {guild.name}
                      {unread > 0 && (
                        <span className="rounded-[10px] bg-gold/85 px-1.5 py-px text-[10px] font-bold text-black/90">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Message preview panel */}
              {selectedGuild && (
                <div className="overflow-hidden rounded-[14px] border border-white/06 bg-white/03">
                  {chatLoading === selectedChatId ? (
                    <div className="flex items-center gap-2 px-4 py-5 text-xs text-white/25">
                      <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                    </div>
                  ) : selectedMessages.length === 0 ? (
                    <div className="px-4 py-5 text-[13px] italic text-white/25">No messages yet</div>
                  ) : (
                    selectedMessages.map((msg, i) => (
                      <MessageRow
                        key={msg.id}
                        msg={msg}
                        color={selectedGuild.color}
                        isLast={i === selectedMessages.length - 1}
                      />
                    ))
                  )}
                  <Link
                    href={`/guild/${selectedChatId}/pulse`}
                    className="flex items-center justify-center gap-1.5 border-t border-white/05 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-gold/60 transition-colors hover:bg-white/03 hover:text-gold/90"
                  >
                    Open full chat →
                  </Link>
                </div>
              )}
            </section>
          )}

          <div className="mb-5 h-px bg-white/07" />

          {/* My Guilds */}
          <section>
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="h-3 w-3 text-white/30" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                  My Guilds
                </span>
              </div>
              <button
                onClick={() => setShowCreateGuild(true)}
                className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/25 transition-colors hover:text-white/60"
              >
                + Seed
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {userGuilds.map((guild) => (
                <Link
                  key={guild.id}
                  href={`/guild/${guild.id}`}
                  className="block rounded-[14px] border border-white/07 bg-white/04 p-4 transition-all hover:border-white/12 hover:bg-white/07"
                >
                  <div
                    className="mb-2.5 flex h-[38px] w-[38px] items-center justify-center rounded-[10px] text-base leading-none"
                    style={{ backgroundColor: `${guild.color}1e` }}
                  >
                    {guild.icon?.startsWith("data:") ? (
                      <img src={guild.icon} alt="" className="h-5 w-5 object-contain" />
                    ) : (guild.icon || "⬡")}
                  </div>
                  <p className="mb-0.5 font-display text-[13px] font-normal tracking-[0.02em] text-white/85">
                    {guild.name}
                  </p>
                  <p className="text-[12px] text-white/30">
                    {guild.memberCount} {guild.memberCount === 1 ? "member" : "members"}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Right sidebar */}
        <div className="custom-scrollbar w-[280px] shrink-0 overflow-y-auto border-l border-white/05 px-5 py-5">

          {/* Upcoming */}
          <div className="mb-6">
            <div className="mb-2.5 flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-white/30" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                Upcoming
              </span>
            </div>

            {loadingEvents ? (
              <div className="flex items-center gap-2 py-4 text-[13px] text-white/25">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </div>
            ) : events.length === 0 ? (
              <p className="py-3 text-[13px] italic text-white/25">No rites foretold</p>
            ) : (
              <div>
                {events.slice(0, 8).map((event) => {
                  const key = `${event.guildId}-${event.uid}`
                  return (
                    <EventAccordionRow
                      key={key}
                      event={event}
                      isOpen={openEventKey === key}
                      onToggle={() => setOpenEventKey(openEventKey === key ? null : key)}
                    />
                  )
                })}
              </div>
            )}
          </div>

          <div className="mb-5 h-px bg-white/07" />

          {/* Live Chambers */}
          <div>
            <div className="mb-2.5 flex items-center gap-1.5">
              <Video className="h-3 w-3 text-white/30" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                Live Chambers
              </span>
            </div>
            {userGuilds.map((guild) => (
              <a
                key={guild.id}
                href={CHAMBER_HREF(guild.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 border-b border-white/05 py-2.5 last:border-0 transition-opacity hover:opacity-70"
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-sm leading-none"
                  style={{ backgroundColor: `${guild.color}1a` }}
                >
                  {guild.icon?.startsWith("data:") ? (
                    <img src={guild.icon} alt="" className="h-4 w-4 object-contain" />
                  ) : (guild.icon || "⬡")}
                </div>
                <span className="flex-1 text-[14px] text-white/60">{guild.name}</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/20">
                  Join
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {showCreateGuild && <CreateGuildModal onClose={() => setShowCreateGuild(false)} />}
    </div>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function formatAgo(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function initials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

function MessageRow({ msg, color, isLast }: { msg: TalkMessage; color: string; isLast: boolean }) {
  return (
    <div
      className={`flex gap-2.5 px-4 py-3 transition-colors hover:bg-white/03 ${
        !isLast ? "border-b border-white/05" : ""
      }`}
    >
      <div
        className="mt-0.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white/80"
        style={{ backgroundColor: `${color}73` }}
      >
        {initials(msg.actorDisplayName || msg.actorId)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-baseline gap-2">
          <span className="text-[13px] font-medium text-white/85">
            {msg.actorDisplayName || msg.actorId}
          </span>
          <span className="text-[11px] text-white/25">{formatAgo(msg.timestamp)}</span>
        </div>
        <p className="text-[14px] leading-snug text-white/50 truncate">{msg.message}</p>
      </div>
    </div>
  )
}

function EventAccordionRow({
  event,
  isOpen,
  onToggle,
}: {
  event: UpcomingEvent
  isOpen: boolean
  onToggle: () => void
}) {
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
    <div className="border-b border-white/05 last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 py-2.5 text-left transition-opacity hover:opacity-80"
      >
        <ChevronRight
          className={`h-3 w-3 shrink-0 text-white/20 transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
        <span className="flex-1 text-[14px] text-white/80">{event.title}</span>
        <span
          className="shrink-0 text-[11px] font-medium whitespace-nowrap"
          style={{ color: isToday ? "#c9a227b3" : `${guildColor}b3` }}
        >
          {dayLabel}
        </span>
      </button>
      {isOpen && (
        <div className="pb-3 pl-[22px]">
          <p className="mb-1.5 text-[13px] leading-relaxed text-white/40">{event.guildName}</p>
          <div className="mb-2 flex gap-3 text-[12px] text-white/25">
            <span>{timeLabel}</span>
          </div>
          <Link
            href={`/guild/${event.guildId}/rites`}
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gold/60 hover:text-gold/90"
          >
            View in Rites →
          </Link>
        </div>
      )}
    </div>
  )
}
