import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { deleteNode, getBreadcrumbs, getNode } from "@/lib/files"
import { getGuild } from "@/lib/guilds"

async function authUsername(): Promise<string | null> {
  const h = await headers()
  return h.get("x-authentik-username")
}

/**
 * GET /api/files/{nodeId}
 *   → { node: FileNode, breadcrumbs: FileNode[] }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  if (!(await authUsername())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { nodeId } = await params
  const node = await getNode(nodeId)
  if (!node) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const guild = await getGuild(node.guildId)
  if (!guild) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const breadcrumbs = await getBreadcrumbs(nodeId)
  return NextResponse.json({ node, breadcrumbs })
}

/**
 * DELETE /api/files/{nodeId}
 *   → { ok: true }
 * Cascades to descendants in DB and S3.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  if (!(await authUsername())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { nodeId } = await params
  const node = await getNode(nodeId)
  if (!node) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const guild = await getGuild(node.guildId)
  if (!guild) return NextResponse.json({ error: "Not found" }, { status: 404 })
  try {
    await deleteNode(nodeId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("deleteNode failed:", err)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
