import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { PutObjectCommand } from "@aws-sdk/client-s3"

import { getGuild } from "@/lib/guilds"
import { getScroll } from "@/lib/scrolls"
import { S3_BUCKET, publicObjectUrl, s3, scrollHeaderKey } from "@/lib/s3"
import { isGuildManager } from "@/types/guild"

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB — a banner image, not a thumbnail

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
}

/**
 * POST /api/scrolls/[scrollId]/header-image
 *   multipart form with `file`
 *   → { url }
 *
 * Seeder-only. Uploads to the shared S3 bucket with public-read so the
 * banner renders on the public (unauthenticated) scroll page too.
 * Client still needs to PATCH the scroll with the returned url.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ scrollId: string }> },
) {
  const h = await headers()
  const username = h.get("x-authentik-username")
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { scrollId } = await params
  const scroll = await getScroll(scrollId)
  if (!scroll) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const guild = await getGuild(scroll.guildId)
  if (!guild || !isGuildManager(guild, username)) {
    return NextResponse.json({ error: "Seeder or steward only" }, { status: 403 })
  }

  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 })
  }
  const ext = MIME_TO_EXT[file.type]
  if (!ext) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 415 })
  }

  const key = scrollHeaderKey(randomUUID(), ext)
  const buf = Buffer.from(await file.arrayBuffer())

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buf,
        ContentType: file.type,
        ContentLength: buf.byteLength,
        ACL: "public-read",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    )
  } catch (err) {
    console.error("scroll header-image upload failed:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }

  return NextResponse.json({ url: publicObjectUrl(key) })
}
