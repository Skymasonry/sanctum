import http from "http"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

function getUser(headersList: Headers): string | null {
  return headersList.get("x-authentik-username")
}

function authentikHeaders(headersList: Headers): Record<string, string> {
  return {
    "X-Authentik-Username": headersList.get("x-authentik-username") || "",
    "X-Authentik-Groups": headersList.get("x-authentik-groups") || "",
    "X-Authentik-Name": headersList.get("x-authentik-name") || "",
  }
}

// Admin Basic Auth for write operations — guild calendars are owned by admin.
// Authentik-only users have no Nextcloud account so their username can't
// resolve a CalDAV principal. We still forward X-Authentik-Username so the
// PHP layer knows who initiated the request.
function adminAuthHeaders(headersList: Headers): Record<string, string> {
  const password = process.env.NEXTCLOUD_ADMIN_PASSWORD ?? ""
  const token = Buffer.from(`admin:${password}`).toString("base64")
  return {
    Authorization: `Basic ${token}`,
    ...authentikHeaders(headersList),
  }
}

function nextcloudRequest(
  method: string,
  path: string,
  authHeaders: Record<string, string>,
  body?: string
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const reqHeaders: Record<string, string> = {
      Accept: "application/json",
      Host: "brothers.skymasons.xyz",
      ...authHeaders,
    }
    if (body) {
      reqHeaders["Content-Type"] = "application/json"
      reqHeaders["Content-Length"] = String(Buffer.byteLength(body))
    }
    const req = http.request(
      { hostname: "nextcloud", port: 80, path, method, headers: reqHeaders },
      (res) => {
        let data = ""
        res.on("data", (chunk) => (data += chunk))
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode || 500, data: data ? JSON.parse(data) : {} })
          } catch {
            resolve({ status: res.statusCode || 500, data: {} })
          }
        })
      }
    )
    req.on("error", reject)
    if (body) req.write(body)
    req.end()
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ calendarUri: string }> }
) {
  const headersList = await headers()
  if (!getUser(headersList)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { calendarUri } = await params
  const url = new URL(request.url)

  try {
    const qs = url.searchParams.toString()
    const { status, data } = await nextcloudRequest(
      "GET",
      `/apps/skymasonsnav/api/calendar/${calendarUri}/events${qs ? `?${qs}` : ""}`,
      authentikHeaders(headersList)
    )
    return NextResponse.json(data, { status })
  } catch (error) {
    console.error("Failed to fetch calendar events:", error)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ calendarUri: string }> }
) {
  const headersList = await headers()
  if (!getUser(headersList)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { calendarUri } = await params

  try {
    const body = await request.json()
    const { status, data } = await nextcloudRequest(
      "POST",
      `/apps/skymasonsnav/api/calendar/${calendarUri}/events`,
      adminAuthHeaders(headersList),
      JSON.stringify(body)
    )
    return NextResponse.json(data, { status })
  } catch (error) {
    console.error("Failed to create calendar event:", error)
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
  }
}
