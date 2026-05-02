import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"
import http from "http"

const NEXTCLOUD_URL = process.env.NEXTCLOUD_INTERNAL_URL || "http://nextcloud:80"

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

function ncRequest(method: string, path: string, authHeaders: Record<string, string>, body?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(NEXTCLOUD_URL)
    const bodyBuf = body ? Buffer.from(body) : null
    const reqOptions: any = {
      hostname: url.hostname,
      port: Number(url.port) || 80,
      path,
      method,
      headers: {
        "Accept": "application/json",
        "Host": "brothers.skymasons.xyz",
        ...authHeaders,
      },
    }
    if (bodyBuf) {
      reqOptions.headers["Content-Type"] = "application/json"
      reqOptions.headers["Content-Length"] = bodyBuf.length
    }
    const req = http.request(reqOptions, (res) => {
      let data = ""
      res.on("data", (chunk: string) => (data += chunk))
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)) } catch { resolve({ success: true }) }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`))
        }
      })
    })
    req.on("error", reject)
    if (bodyBuf) req.write(bodyBuf)
    req.end()
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const auth = await getAuthHeaders()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { guildId } = await params

  try {
    const body = await request.json()
    const data = await ncRequest("PATCH", `/apps/skymasonsnav/api/orders/${guildId}`, auth, JSON.stringify(body))
    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to update guild:", error)
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const auth = await getAuthHeaders()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { guildId } = await params

  try {
    const url = new URL(request.url)
    const action = url.searchParams.get("action")
    
    if (!action) {
      return NextResponse.json({ error: "Action required" }, { status: 400 })
    }

    let path = ""
    let body: string | undefined

    switch (action) {
      case "join":
        path = `/apps/skymasonsnav/api/orders/${guildId}/join`
        break
      case "apply":
        path = `/apps/skymasonsnav/api/orders/${guildId}/apply`
        break
      case "leave":
        path = `/apps/skymasonsnav/api/orders/${guildId}/leave`
        break
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const data = await ncRequest("POST", path, auth, body)
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Failed guild action:`, error)
    return NextResponse.json({ error: "Action failed" }, { status: 500 })
  }
}
