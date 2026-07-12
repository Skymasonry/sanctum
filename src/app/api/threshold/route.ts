import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { postToNextcloud } from "@/lib/api"
import { getGuilds } from "@/lib/guilds"
import { getRooms, type TalkRoom } from "@/lib/talk"
import type {
  Gathering,
  StirringGuild,
  ThresholdData,
} from "@/types/threshold"

export async function GET() {
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

  const [guilds, rooms, lastSeenResp] = await Promise.all([
    getGuilds(),
    getRooms(),
    touchLastSeen(authHeaders),
  ])

  const roomsByToken = new Map<string, TalkRoom>()
  for (const r of rooms) roomsByToken.set(r.token, r)

  const stirring: StirringGuild[] = guilds.map(g => {
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

  const gatherings: Gathering[] = []

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
