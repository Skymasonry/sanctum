import http from "http"

import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

const NEXTCLOUD_URL = process.env.NEXTCLOUD_INTERNAL_URL || "http://nextcloud:80"

async function getAuthHeaders() {
  const h = await headers()
  const username = h.get("x-authentik-username")
  if (!username) return null
  return {
    "X-Authentik-Username": username,
    "X-Authentik-Groups": h.get("x-authentik-groups") || "",
    "X-Authentik-Name": h.get("x-authentik-name") || "",
  }
}

function ncPost(path: string, body: string, authHeaders: Record<string, string>): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(NEXTCLOUD_URL)
    const bodyBuf = Buffer.from(body)
    const req = http.request(
      {
        hostname: url.hostname,
        port: Number(url.port) || 80,
        path,
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Content-Length": bodyBuf.length,
          Host: "brothers.skymasons.xyz",
          ...authHeaders,
        },
      },
      res => {
        let data = ""
        res.on("data", c => (data += c))
        res.on("end", () => resolve({ status: res.statusCode ?? 500, body: data }))
      },
    )
    req.on("error", reject)
    req.write(bodyBuf)
    req.end()
  })
}

/**
 * Provision (or re-fetch) a chamber for a guild.
 *
 * Body: { type: "chat" | "calendar" | "folder", name?: string }
 * Only the seeder can create spaces (enforced by the backend).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> },
) {
  const auth = await getAuthHeaders()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { guildId } = await params
  const body = await request.text()

  try {
    const res = await ncPost(
      `/apps/skymasonsnav/api/orders/${guildId}/spaces`,
      body,
      auth,
    )
    let parsed: unknown = null
    try { parsed = JSON.parse(res.body) } catch {}
    return NextResponse.json(parsed ?? { error: "Empty response" }, { status: res.status })
  } catch (err) {
    console.error("provision-space failed:", err)
    return NextResponse.json({ error: "Failed to provision space" }, { status: 500 })
  }
}
