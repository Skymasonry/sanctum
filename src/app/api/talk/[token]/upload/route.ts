import http from "http"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const headersList = await headers()
  const username = headersList.get("x-authentik-username")
  const groups = headersList.get("x-authentik-groups")
  const name = headersList.get("x-authentik-name")

  if (!username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Browsers on mobile sometimes drop the mime type when picking a photo,
    // sending application/octet-stream. Fall back to extension-based guess
    // so the "images/audio/video only" gate in the backend doesn't reject
    // real photos.
    const mime = file.type && file.type !== "application/octet-stream"
      ? file.type
      : guessMimeByExtension(file.name)

    const result = await uploadToNextcloud(token, file.name, mime, buffer, username, groups || "", name || "")

    return NextResponse.json(result)
  } catch (error) {
    console.error("Media upload error:", error)
    if (error instanceof Error) {
      // Propagate upstream 4xx so the frontend can show a real reason.
      const m = error.message.match(/^HTTP (\d+): (.+)$/)
      if (m) {
        const status = Number(m[1])
        try {
          const body = JSON.parse(m[2])
          return NextResponse.json(body, { status })
        } catch {
          return NextResponse.json({ error: m[2] }, { status })
        }
      }
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

function guessMimeByExtension(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || ""
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
    webp: "image/webp", heic: "image/heic", heif: "image/heif", svg: "image/svg+xml",
    bmp: "image/bmp", tiff: "image/tiff", tif: "image/tiff",
    mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4",
    aac: "audio/aac", flac: "audio/flac",
    mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
    avi: "video/x-msvideo", mkv: "video/x-matroska",
  }
  return map[ext] || "application/octet-stream"
}

function uploadToNextcloud(
  token: string,
  fileName: string,
  mimeType: string,
  fileBuffer: Buffer,
  username: string,
  groups: string,
  name: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const boundary = "----FormBoundary" + Math.random().toString(36).slice(2)

    const header = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    )
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`)
    const body = Buffer.concat([header, fileBuffer, footer])

    const req = http.request(
      {
        hostname: "nextcloud",
        port: 80,
        path: `/apps/skymasonsnav/api/talk/rooms/${token}/media`,
        method: "POST",
        headers: {
          Host: "brothers.skymasons.xyz",
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
          "X-Authentik-Username": username,
          "X-Authentik-Groups": groups,
          "X-Authentik-Name": name,
        },
      },
      (res) => {
        let data = ""
        res.on("data", (chunk) => (data += chunk))
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data))
            } catch {
              reject(new Error("Invalid JSON response"))
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`))
          }
        })
      }
    )

    req.on("error", reject)
    req.setTimeout(30000, () => {
      req.destroy()
      reject(new Error("Upload timeout"))
    })
    req.write(body)
    req.end()
  })
}
