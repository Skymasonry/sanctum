import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { updateGuildChambers } from "@/lib/guild-writes"
import { getGuild } from "@/lib/guilds"
import type { ChamberId } from "@/types/guild"

/**
 * PATCH /api/guilds/{guildId}/chambers
 *   { chambers: ChamberId[] }
 * Seeder-only. Replaces the chambers list wholesale.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> },
) {
  const h = await headers()
  const caller = h.get("x-authentik-username")
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { guildId } = await params
  const guild = await getGuild(guildId)
  if (!guild) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (caller.toLowerCase() !== guild.seederUid.toLowerCase()) {
    return NextResponse.json({ error: "Seeder only" }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as { chambers?: ChamberId[] }
  if (!Array.isArray(body.chambers)) {
    return NextResponse.json({ error: "chambers array required" }, { status: 400 })
  }

  const ok = await updateGuildChambers(guildId, body.chambers)
  if (!ok) return NextResponse.json({ error: "Update failed" }, { status: 500 })
  return NextResponse.json({ ok: true })
}
