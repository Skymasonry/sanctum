import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { getVapidPublicKey } from "@/lib/push"

/**
 * GET /api/push/vapid-public-key — the client needs this at
 * pushManager.subscribe() time. Served at request time rather than
 * baked into the client bundle via NEXT_PUBLIC_ so it doesn't depend
 * on the env var being present during the build step specifically
 * (only at container runtime, which is where it's actually set).
 */
export async function GET() {
  const h = await headers()
  if (!h.get("x-authentik-username")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const publicKey = getVapidPublicKey()
  if (!publicKey) return NextResponse.json({ error: "Push not configured" }, { status: 503 })
  return NextResponse.json({ publicKey })
}
