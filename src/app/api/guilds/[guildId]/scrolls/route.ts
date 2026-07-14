import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { createScroll, listScrollsForGuild } from "@/lib/scrolls"

async function username(): Promise<string | null> {
  const h = await headers()
  return h.get("x-authentik-username")
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> },
) {
  if (!(await username())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { guildId } = await params
  const scrolls = await listScrollsForGuild(guildId)
  return NextResponse.json({ scrolls })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> },
) {
  const u = await username()
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { guildId } = await params
  const body = (await req.json().catch(() => ({}))) as { title?: string; description?: string }
  if (!body.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 })
  const scroll = await createScroll(guildId, u, { title: body.title.trim(), description: body.description })
  return NextResponse.json({ scroll })
}
