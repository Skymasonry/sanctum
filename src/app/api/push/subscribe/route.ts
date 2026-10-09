import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { saveSubscription, type PushSubscriptionInput } from "@/lib/push"

export async function POST(request: NextRequest) {
  const h = await headers()
  const username = h.get("x-authentik-username")
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => null)) as PushSubscriptionInput | null
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
  }

  await saveSubscription(username, body)
  return NextResponse.json({ success: true })
}
