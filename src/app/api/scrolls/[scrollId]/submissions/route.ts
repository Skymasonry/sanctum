import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { addMember } from "@/lib/guild-writes"
import { getScroll, listSubmissions, submitScroll } from "@/lib/scrolls"

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ scrollId: string }> },
) {
  const auth = await authHeaders()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { scrollId } = await params
  const submissions = await listSubmissions(scrollId)
  return NextResponse.json({ submissions })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scrollId: string }> },
) {
  const auth = await authHeaders()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { scrollId } = await params

  const body = (await req.json().catch(() => ({}))) as { answers?: Record<string, unknown> }
  if (!body.answers) return NextResponse.json({ error: "answers required" }, { status: 400 })

  const scroll = await getScroll(scrollId)
  if (!scroll) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const username = auth["X-Authentik-Username"]
  const submission = await submitScroll(scrollId, username, null, body.answers)

  // Auto-join is best-effort: a Nextcloud hiccup on the sync side
  // shouldn't fail a submission that already saved successfully.
  if (scroll.autoJoinGuild) {
    try {
      await addMember(scroll.guildId, username, auth)
    } catch (err) {
      console.error(`auto-join ${scroll.guildId} for ${username} after scroll ${scrollId} failed:`, err)
    }
  }

  return NextResponse.json({ submission })
}
