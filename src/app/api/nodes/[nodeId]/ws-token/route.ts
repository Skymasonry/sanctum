import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { getNode } from "@/lib/files"
import { isDocNode } from "@/lib/files-shared"
import { getGuild } from "@/lib/guilds"
import { signWsToken } from "@/lib/ws-token"

async function authUsername(): Promise<string | null> {
  const h = await headers()
  return h.get("x-authentik-username")
}

/**
 * GET /api/nodes/{nodeId}/ws-token
 *   → { token, wsUrl }
 * Short-lived (60s) token used by the client to authenticate its
 * upgrade handshake to the HocusPocus server. The token binds a
 * userId + nodeId + guildId; HocusPocus verifies the same secret.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const caller = await authUsername()
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { nodeId } = await params
  const node = await getNode(nodeId)
  if (!node) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const guild = await getGuild(node.guildId)
  if (!guild) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!isDocNode(node)) {
    return NextResponse.json({ error: "Not a doc" }, { status: 400 })
  }

  const token = signWsToken({ nodeId, userId: caller, guildId: node.guildId })
  return NextResponse.json({
    token,
    wsUrl: process.env.SANCTUM_WS_PUBLIC_URL ?? "wss://neo.skymasons.xyz/hocus",
  })
}
