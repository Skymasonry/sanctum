import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { createGuild, type CreateGuildInput } from "@/lib/guild-writes"

async function authHeaders(): Promise<Record<string, string> | null> {
  const h = await headers()
  const username = h.get("x-authentik-username")
  if (!username) return null
  return {
    "X-Authentik-Username": username,
    "X-Authentik-Groups": h.get("x-authentik-groups") ?? "",
    "X-Authentik-Name": h.get("x-authentik-name") ?? "",
  }
}

/**
 * POST /api/guilds/create — native guild creation.
 *
 * Writes the guild row directly, seeds an empty application form, then
 * kicks the sync so Nextcloud picks up the primitives (group / talk /
 * folder). Returns { guild: { id } } — the caller can navigate straight
 * to /guild/{id}.
 */
export async function POST(request: NextRequest) {
  const auth = await authHeaders()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as CreateGuildInput
  if (!body?.name || body.name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  try {
    const id = await createGuild(auth["X-Authentik-Username"], body, auth)
    return NextResponse.json({ guild: { id } })
  } catch (err) {
    console.error("createGuild failed:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create guild" },
      { status: 500 },
    )
  }
}
