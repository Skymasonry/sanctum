import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { listSubmissions, submitScroll } from "@/lib/scrolls"

async function username(): Promise<string | null> {
  const h = await headers()
  return h.get("x-authentik-username")
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ scrollId: string }> },
) {
  if (!(await username())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { scrollId } = await params
  const submissions = await listSubmissions(scrollId)
  return NextResponse.json({ submissions })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scrollId: string }> },
) {
  const u = await username()
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { scrollId } = await params
  const body = (await req.json().catch(() => ({}))) as { answers?: Record<string, unknown> }
  if (!body.answers) return NextResponse.json({ error: "answers required" }, { status: 400 })
  const submission = await submitScroll(scrollId, u, body.answers)
  return NextResponse.json({ submission })
}
