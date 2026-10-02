import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { provisionSpace, type SpaceType } from "@/lib/guild-writes"

async function getAuthHeaders() {
  const h = await headers()
  const username = h.get("x-authentik-username")
  if (!username) return null
  return {
    "X-Authentik-Username": username,
    "X-Authentik-Groups": h.get("x-authentik-groups") || "",
    "X-Authentik-Name": h.get("x-authentik-name") || "",
  }
}

const VALID_TYPES: SpaceType[] = ["chat", "calendar", "folder"]

/**
 * Provision (or re-fetch) a chamber for a guild.
 *
 * Body: { type: "chat" | "calendar" | "folder" }
 * Only the seeder can create spaces (enforced by the backend). The
 * resulting resource id is persisted onto the guild row by
 * provisionSpace — this route no longer just proxies the raw response.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> },
) {
  const auth = await getAuthHeaders()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { guildId } = await params
  const body = (await request.json().catch(() => ({}))) as { type?: string }
  if (!body.type || !VALID_TYPES.includes(body.type as SpaceType)) {
    return NextResponse.json({ error: "type must be chat, calendar, or folder" }, { status: 400 })
  }

  try {
    const result = await provisionSpace(guildId, body.type as SpaceType, auth)
    if (Object.keys(result).length === 0) {
      return NextResponse.json(
        { error: "Nextcloud didn't return a usable resource id — check server logs" },
        { status: 502 },
      )
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error("provision-space failed:", err)
    return NextResponse.json({ error: "Failed to provision space" }, { status: 500 })
  }
}
