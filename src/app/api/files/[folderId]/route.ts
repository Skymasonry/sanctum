import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"
import http from "http"

const NEXTCLOUD_URL = process.env.NEXTCLOUD_INTERNAL_URL || "http://nextcloud:80"

class UpstreamError extends Error {
  constructor(public status: number, public body: string) {
    super(`HTTP ${status}: ${body.slice(0, 200)}`)
  }
}

function fetchNC(path: string, authHeaders: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(NEXTCLOUD_URL)
    const reqOptions = {
      hostname: url.hostname,
      port: Number(url.port) || 80,
      path: path,
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Host": "brothers.skymasons.xyz",
        ...authHeaders,
      },
    }

    const req = http.request(reqOptions, (res) => {
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
          reject(new UpstreamError(res.statusCode ?? 500, data))
        }
      })
    })

    req.on("error", reject)
    req.end()
  })
}

function uploadNC(
  path: string,
  authHeaders: Record<string, string>,
  fileBuffer: Buffer,
  filename: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(NEXTCLOUD_URL)
    const boundary = "----NeoUpload" + Date.now()

    const header = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`
    )
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`)
    const body = Buffer.concat([header, fileBuffer, footer])

    const reqOptions = {
      hostname: url.hostname,
      port: Number(url.port) || 80,
      path: path,
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Host": "brothers.skymasons.xyz",
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
        ...authHeaders,
      },
    }

    const req = http.request(reqOptions, (res) => {
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
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`))
        }
      })
    })

    req.on("error", reject)
    req.write(body)
    req.end()
  })
}

async function getAuthHeaders() {
  const headersList = await headers()
  const username = headersList.get("x-authentik-username")
  const groups = headersList.get("x-authentik-groups")
  const name = headersList.get("x-authentik-name")

  if (!username) return null

  return {
    "X-Authentik-Username": username,
    "X-Authentik-Groups": groups || "",
    "X-Authentik-Name": name || "",
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const auth = await getAuthHeaders()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { folderId } = await params

  try {
    const data = await fetchNC(`/apps/skymasonsnav/api/files/${folderId}`, auth)
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof UpstreamError) {
      return NextResponse.json(
        { error: "Failed to fetch files" },
        { status: error.status },
      )
    }
    console.error("Failed to fetch files:", error)
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const auth = await getAuthHeaders()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { folderId } = await params

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const data = await uploadNC(
      `/apps/skymasonsnav/api/files/${folderId}/upload`,
      auth,
      buffer,
      file.name
    )
    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to upload file:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
