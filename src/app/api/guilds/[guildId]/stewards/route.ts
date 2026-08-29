import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { addSteward, removeSteward } from "@/lib/guild-writes"
import { getGuild } from "@/lib/guilds"
import { isGuildManager } from "@/types/guild"

async function requireManager(
  guildId: string,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const h = await headers()
  const username = h.get("x-authentik-username")
  if (!username) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  const guild = await getGuild(guildId)
  if (!guild) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  }
  if (!isGuildManager(guild, username)) {
    return { ok: false, response: NextResponse.json({ error: "Seeder or steward only" }, { status: 403 }) }
  }
  return { ok: true }
}

/**
 * POST/DELETE — add or remove a steward. Seeder-or-steward gated: any
 * current manager can grant or revoke stewardship, including their
 * own (matches "editable only by current stewards" — the set is
 * self-governing once non-empty).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> },
) {
  const { guildId } = await params
  const gate = await requireManager(guildId)
  if (!gate.ok) return gate.response

  const body = (await request.json().catch(() => ({}))) as { userId?: string }
  if (!body.userId?.trim()) return NextResponse.json({ error: "userId required" }, { status: 400 })

  const ok = await addSteward(guildId, body.userId.trim())
  return NextResponse.json({ success: ok })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> },
) {
  const { guildId } = await params
  const gate = await requireManager(guildId)
  if (!gate.ok) return gate.response

  const body = (await request.json().catch(() => ({}))) as { userId?: string }
  if (!body.userId?.trim()) return NextResponse.json({ error: "userId required" }, { status: 400 })

  const ok = await removeSteward(guildId, body.userId.trim())
  return NextResponse.json({ success: ok })
}
