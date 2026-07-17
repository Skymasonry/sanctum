import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { createQuest } from "@/lib/quests"

async function authUsername(): Promise<string | null> {
  const h = await headers()
  return h.get("x-authentik-username")
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stackId: string }> },
) {
  const username = await authUsername()
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { stackId } = await params
  const body = (await request.json().catch(() => ({}))) as {
    title?: string; description?: string; dueAt?: string | null
  }
  if (!body.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 })
  try {
    const quest = await createQuest(stackId, username, {
      title: body.title.trim(),
      description: body.description ?? "",
      dueAt: body.dueAt ?? null,
    })
    return NextResponse.json({ quest })
  } catch (err) {
    console.error("createQuest failed:", err)
    return NextResponse.json({ error: "Failed to create quest" }, { status: 500 })
  }
}
