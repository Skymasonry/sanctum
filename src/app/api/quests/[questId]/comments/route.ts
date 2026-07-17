import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { addComment, listComments } from "@/lib/quests"

async function authUsername(): Promise<string | null> {
  const h = await headers()
  return h.get("x-authentik-username")
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ questId: string }> },
) {
  if (!(await authUsername())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { questId } = await params
  const comments = await listComments(questId)
  return NextResponse.json({ comments })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ questId: string }> },
) {
  const username = await authUsername()
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { questId } = await params
  const body = (await request.json().catch(() => ({}))) as { body?: string }
  if (!body.body?.trim()) return NextResponse.json({ error: "Body required" }, { status: 400 })
  const comment = await addComment(questId, username, body.body.trim())
  return NextResponse.json({ comment })
}
