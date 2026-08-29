import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { getGuild } from "@/lib/guilds"
import { deleteScroll, getScroll, updateScroll } from "@/lib/scrolls"

async function username(): Promise<string | null> {
  const h = await headers()
  return h.get("x-authentik-username")
}

async function requireSeeder(
  scrollId: string,
  callerUsername: string,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const scroll = await getScroll(scrollId)
  if (!scroll) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  }
  const guild = await getGuild(scroll.guildId)
  if (!guild || callerUsername.toLowerCase() !== guild.seederUid.toLowerCase()) {
    return { ok: false, response: NextResponse.json({ error: "Seeder only" }, { status: 403 }) }
  }
  return { ok: true }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ scrollId: string }> },
) {
  if (!(await username())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { scrollId } = await params
  const scroll = await getScroll(scrollId)
  if (!scroll) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ scroll })
}

/**
 * Seeder-only — this can flip publicAccess (no-auth submissions) and
 * autoJoinGuild (instant membership on submit), so it's gated tighter
 * than a plain "any authenticated member" check.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ scrollId: string }> },
) {
  const u = await username()
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { scrollId } = await params
  const gate = await requireSeeder(scrollId, u)
  if (!gate.ok) return gate.response

  const body = (await req.json().catch(() => ({}))) as {
    title?: string
    description?: string
    published?: boolean
    headerImageUrl?: string | null
    autoJoinGuild?: boolean
    publicAccess?: boolean
  }
  const ok = await updateScroll(scrollId, body)
  return NextResponse.json({ success: ok })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ scrollId: string }> },
) {
  const u = await username()
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { scrollId } = await params
  const gate = await requireSeeder(scrollId, u)
  if (!gate.ok) return gate.response
  const ok = await deleteScroll(scrollId)
  return NextResponse.json({ success: ok })
}
