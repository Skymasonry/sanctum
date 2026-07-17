import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { PutObjectCommand } from "@aws-sdk/client-s3"

import { S3_BUCKET, guildIconKey, publicObjectUrl, s3 } from "@/lib/s3"

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB — plenty for a 256px square

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
}

/**
 * POST /api/guild-icons
 *   multipart form with `file`
 *   → { url }
 *
 * Uploads a guild icon to the shared S3 bucket with public-read so it
 * can render on Discover / sidebar / cards without a session. Client
 * is expected to have already resized/cropped to a square (this route
 * does no image processing — sharp would be a heavyweight dep).
 */
export async function POST(request: NextRequest) {
  const h = await headers()
  const username = h.get("x-authentik-username")
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 2 MB)" }, { status: 413 })
  }
  const ext = MIME_TO_EXT[file.type]
  if (!ext) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 415 })
  }

  const key = guildIconKey(randomUUID(), ext)
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
    console.error("guild-icon upload failed:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }

  return NextResponse.json({ url: publicObjectUrl(key) })
}
