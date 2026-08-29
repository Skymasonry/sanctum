import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { removeSubscription } from "@/lib/push"

export async function POST(request: NextRequest) {
  const h = await headers()
  if (!h.get("x-authentik-username")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null
  if (!body?.endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 })

  await removeSubscription(body.endpoint)
  return NextResponse.json({ success: true })
}
