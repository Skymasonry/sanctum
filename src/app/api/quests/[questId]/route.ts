import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { deleteQuest, moveQuest, updateQuest } from "@/lib/quests"

async function authUsername(): Promise<string | null> {
  const h = await headers()
  return h.get("x-authentik-username")
}

interface PatchBody {
  title?: string
  description?: string
  dueAt?: string | null
  completedAt?: string | null
  // move semantics
  stackId?: string
  position?: number
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ questId: string }> },
) {
  if (!(await authUsername())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { questId } = await params
  const body = (await request.json().catch(() => ({}))) as PatchBody

  if (body.stackId !== undefined && body.position !== undefined) {
    const ok = await moveQuest(questId, body.stackId, body.position)
    if (!ok) return NextResponse.json({ error: "Quest not found" }, { status: 404 })
  }

  const { stackId, position, ...rest } = body
  void stackId; void position
  const ok = await updateQuest(questId, rest)
  return NextResponse.json({ success: ok })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ questId: string }> },
) {
  if (!(await authUsername())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { questId } = await params
  const ok = await deleteQuest(questId)
  return NextResponse.json({ success: ok })
}
