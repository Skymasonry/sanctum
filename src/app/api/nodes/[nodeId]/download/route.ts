import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { getNode, presignDownload } from "@/lib/files"
import { getGuild } from "@/lib/guilds"

async function authUsername(): Promise<string | null> {
  const h = await headers()
  return h.get("x-authentik-username")
}

/**
 * GET /api/files/{nodeId}/download
 *   302 → presigned S3 URL (5-min TTL, forced attachment filename).
 * If `?json=1`, returns { url } instead of redirecting — useful for
 * "open in new tab" flows that need the raw URL.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  if (!(await authUsername())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { nodeId } = await params
  const node = await getNode(nodeId)
  if (!node) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const guild = await getGuild(node.guildId)
  if (!guild) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (node.isFolder) return NextResponse.json({ error: "Folder" }, { status: 400 })

  try {
    const url = await presignDownload(node)
    if (request.nextUrl.searchParams.get("json") === "1") {
      return NextResponse.json({ url })
    }
    return NextResponse.redirect(url, { status: 302 })
  } catch (err) {
    console.error("presignDownload failed:", err)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
