import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { fetchFromNextcloud, postToNextcloud } from "@/lib/api"
import { getEvents } from "@/lib/calendar"
import { getGuilds } from "@/lib/guilds"
import { getRooms, type TalkRoom } from "@/lib/talk"
import type { Guild } from "@/types/guild"
import type {
  Gathering,
  StirringGuild,
  ThresholdData,
} from "@/types/threshold"

const MAX_GATHERINGS = 15
// Only look this far ahead when picking upcoming events.
const HORIZON_MS = 90 * 24 * 60 * 60 * 1000

export async function GET(request: Request) {
  const headersList = await headers()
  const username = headersList.get("x-authentik-username")
  const groups = headersList.get("x-authentik-groups") || ""
  const name = headersList.get("x-authentik-name") || ""

  if (!username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const authHeaders = {
    "X-Authentik-Username": username,
    "X-Authentik-Groups": groups,
    "X-Authentik-Name": name,
  }

  // Only advance the "since {last visit}" pointer when this call marks
  // an actual dashboard entry (?touch=1). Polls and Sidebar fetches
  // leave it alone.
  const url = new URL(request.url)
  const shouldTouch = url.searchParams.get("touch") === "1"

  // /api/threshold is a per-user surface. Never return guilds the caller
  // isn't a member of, even by name — that would leak the existence of
  // private guilds. Source of truth: orders.json members[].
  const allGuilds = await getGuilds()
  const nameLc = username.toLowerCase()
  const myGuilds = allGuilds.filter(g =>
    (g.members ?? []).some(m => m.toLowerCase() === nameLc),
  )

  const [rooms, lastSeenResp, gatherings] = await Promise.all([
    getRooms(),
    shouldTouch ? touchLastSeen(authHeaders) : readLastSeen(authHeaders),
    collectGatherings(myGuilds),
  ])

  const roomsByToken = new Map<string, TalkRoom>()
  for (const r of rooms) roomsByToken.set(r.token, r)

  const stirring: StirringGuild[] = myGuilds.map(g => {
    const token = g.resources?.talkRoom || null
    const room = token ? roomsByToken.get(token) : undefined
    return {
      guildId: g.id,
      name: g.name,
      glyph: g.icon || "◈",
      lastActivity: room?.lastActivity
        ? new Date(room.lastActivity * 1000).toISOString()
        : null,
      unreadMessages: room?.unreadMessages ?? 0,
      newFiles: 0,
      eventChanges: 0,
      presentNow: 0,
    }
  })

  // Sort by activity: active (has any signal) first, most recent first
  stirring.sort((a, b) => {
    const aActive = a.unreadMessages + a.newFiles + a.eventChanges + a.presentNow > 0
    const bActive = b.unreadMessages + b.newFiles + b.eventChanges + b.presentNow > 0
    if (aActive !== bActive) return aActive ? -1 : 1
    const aT = a.lastActivity ? Date.parse(a.lastActivity) : 0
    const bT = b.lastActivity ? Date.parse(b.lastActivity) : 0
    return bT - aT
  })

  const data: ThresholdData = {
    member: {
      name: name || username,
      avatar: `/api/avatar/${username}/64`,
      lastSeen: lastSeenResp.previous,
    },
    live: [],
    stirring,
    gatherings,
  }

  return NextResponse.json(data)
}

async function collectGatherings(guilds: Guild[]): Promise<Gathering[]> {
  const now = Date.now()
  const horizon = now + HORIZON_MS

  const perGuild = await Promise.all(
    guilds
      .filter(g => !!g.resources?.calendarUri)
      .map(async g => {
        try {
          const events = await getEvents(g.resources.calendarUri!)
          return events
            .map(ev => toGathering(ev, g))
            .filter((ev): ev is Gathering => {
              if (!ev) return false
              const t = Date.parse(ev.startsAt)
              return Number.isFinite(t) && t >= now && t <= horizon
            })
        } catch {
          return [] as Gathering[]
        }
      }),
  )

  return perGuild
    .flat()
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .slice(0, MAX_GATHERINGS)
}

function toGathering(
  ev: { uid: string; title: string; start: string; location?: string },
  g: Guild,
): Gathering | null {
  if (!ev.start) return null
  return {
    id: `${g.id}:${ev.uid}`,
    title: ev.title,
    startsAt: ev.start,
    location: ev.location || null,
    guild: g.name,
    attending: 0,
    capacity: null,
    rsvp: null,
    accessModel: g.admission === "closed" ? "apply" : "join",
  }
}

async function touchLastSeen(
  authHeaders: Record<string, string>,
): Promise<{ previous: string | null; current: string }> {
  try {
    return await postToNextcloud(
      "/apps/skymasonsnav/api/threshold/last-seen",
      {},
      { headers: authHeaders },
    )
  } catch (err) {
    console.error("touchLastSeen failed:", err)
    return { previous: null, current: new Date().toISOString() }
  }
}

async function readLastSeen(
  authHeaders: Record<string, string>,
): Promise<{ previous: string | null; current: string }> {
  try {
    const resp = await fetchFromNextcloud(
      "/apps/skymasonsnav/api/threshold/last-seen",
      { headers: authHeaders },
    )
    return { previous: resp?.lastSeen ?? null, current: new Date().toISOString() }
  } catch {
    return { previous: null, current: new Date().toISOString() }
  }
}
