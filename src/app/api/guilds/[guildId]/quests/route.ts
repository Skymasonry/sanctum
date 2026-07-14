import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { getBoardForGuild, provisionBoard } from "@/lib/quests"

async function authUsername(): Promise<string | null> {
  const h = await headers()
  return h.get("x-authentik-username")
}

/**
 * GET /api/guilds/{guildId}/quests
 *   → { board: QuestBoard | null }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> },
) {
  if (!(await authUsername())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { guildId } = await params
  const board = await getBoardForGuild(guildId)
  return NextResponse.json({ board })
}

/**
 * POST /api/guilds/{guildId}/quests
 *   → provision the board (idempotent). Returns { board: QuestBoard }.
 *   Seeder-only in practice; the frontend gates this.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> },
) {
  if (!(await authUsername())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { guildId } = await params
  try {
    const board = await provisionBoard(guildId)
    return NextResponse.json({ board })
  } catch (err) {
    console.error("provisionBoard failed:", err)
    return NextResponse.json({ error: "Failed to provision quests" }, { status: 500 })
  }
}
