import http from "http"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

const NEXTCLOUD_URL = process.env.NEXTCLOUD_INTERNAL_URL || "http://nextcloud:80"

/**
 * POST /api/talk/{token}/read
 *   { lastReadMessage: number }
 *
 * Marks the Talk room as read at the given message id by proxying to
 * Nextcloud's Spreed OCS API. This is what actually decrements the
 * unreadMessages counter that surfaces in the sidebar / dashboard /
 * chamber-card badges.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const h = await headers()
  const username = h.get("x-authentik-username")
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { lastReadMessage?: number }
  const lastReadMessage = Number(body?.lastReadMessage)
  if (!Number.isFinite(lastReadMessage) || lastReadMessage <= 0) {
    return NextResponse.json({ error: "lastReadMessage required" }, { status: 400 })
  }

  const payload = Buffer.from(JSON.stringify({ lastReadMessage }))
  const url = new URL(NEXTCLOUD_URL)

  return new Promise<Response>(resolve => {
    const req = http.request(
      {
        hostname: url.hostname,
        port: Number(url.port) || 80,
        path: `/ocs/v2.php/apps/spreed/api/v1/chat/${encodeURIComponent(token)}/read`,
        method: "POST",
        headers: {
          "Host": "brothers.skymasons.xyz",
          "Content-Type": "application/json",
          "Content-Length": payload.length,
          "OCS-APIRequest": "true",
          "Accept": "application/json",
          "X-Authentik-Username": username,
          "X-Authentik-Groups": h.get("x-authentik-groups") ?? "",
          "X-Authentik-Name": h.get("x-authentik-name") ?? "",
        },
      },
      res => {
        let data = ""
        res.on("data", c => (data += c))
        res.on("end", () => {
          const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 300
          resolve(
            NextResponse.json(
              ok ? { ok: true } : { error: `HTTP ${res.statusCode}`, body: data.slice(0, 200) },
              { status: ok ? 200 : 502 },
            ),
          )
        })
      },
    )
    req.on("error", err => {
      resolve(NextResponse.json({ error: err.message }, { status: 502 }))
    })
    req.write(payload)
    req.end()
  })
}
