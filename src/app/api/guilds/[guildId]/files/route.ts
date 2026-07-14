import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { createFolder, listChildren, uploadFile } from "@/lib/files"
import { getGuild } from "@/lib/guilds"

async function authUsername(): Promise<string | null> {
  const h = await headers()
  return h.get("x-authentik-username")
}

/**
 * GET /api/guilds/{guildId}/files?parent={nodeId?}
 *   → { children: FileNode[] }
 * Returns root-level children when `parent` is omitted or empty.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> },
) {
  const caller = await authUsername()
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { guildId } = await params
  const guild = await getGuild(guildId)
  if (!guild) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const parent = request.nextUrl.searchParams.get("parent")
  const children = await listChildren(guildId, parent && parent.length > 0 ? parent : null)
  return NextResponse.json({ children })
}

/**
 * POST /api/guilds/{guildId}/files
 *
 * Multipart form: upload a file. Fields:
 *   file      — the blob (required)
 *   parentId  — optional destination folder id (root if omitted)
 *   name      — optional override; defaults to file.name
 *
 * JSON body: create a folder. Fields:
 *   folderName — required
 *   parentId   — optional; root if omitted
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> },
) {
  const caller = await authUsername()
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { guildId } = await params
  const guild = await getGuild(guildId)
  if (!guild) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.startsWith("multipart/form-data")) {
    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }
    const parentIdRaw = form.get("parentId")
    const parentId = typeof parentIdRaw === "string" && parentIdRaw.length > 0 ? parentIdRaw : null
    const nameRaw = form.get("name")
    const name = typeof nameRaw === "string" && nameRaw.length > 0 ? nameRaw : file.name
    const buf = Buffer.from(await file.arrayBuffer())
    try {
      const node = await uploadFile(
        guildId,
        parentId,
        name,
        caller,
        buf,
        file.type || "application/octet-stream",
      )
      return NextResponse.json({ node })
    } catch (err) {
      console.error("uploadFile failed:", err)
      return NextResponse.json({ error: "Upload failed" }, { status: 500 })
    }
  }

  const body = (await request.json().catch(() => ({}))) as {
    folderName?: string
    parentId?: string | null
  }
  if (!body.folderName || body.folderName.trim().length === 0) {
    return NextResponse.json({ error: "folderName required" }, { status: 400 })
  }
  try {
    const node = await createFolder(
      guildId,
      body.parentId ?? null,
      body.folderName.trim(),
      caller,
    )
    return NextResponse.json({ node })
  } catch (err) {
    console.error("createFolder failed:", err)
    return NextResponse.json({ error: "Folder create failed" }, { status: 500 })
  }
}
