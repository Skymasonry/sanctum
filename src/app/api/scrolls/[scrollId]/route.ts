import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { deleteScroll, getScroll, updateScroll } from "@/lib/scrolls"

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
  const scroll = await getScroll(scrollId)
  if (!scroll) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ scroll })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ scrollId: string }> },
) {
  if (!(await username())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { scrollId } = await params
  const body = (await req.json().catch(() => ({}))) as {
    title?: string; description?: string; published?: boolean
  }
  const ok = await updateScroll(scrollId, body)
  return NextResponse.json({ success: ok })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ scrollId: string }> },
) {
  if (!(await username())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { scrollId } = await params
  const ok = await deleteScroll(scrollId)
  return NextResponse.json({ success: ok })
}
