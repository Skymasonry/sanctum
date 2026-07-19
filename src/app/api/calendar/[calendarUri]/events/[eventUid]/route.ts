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

function adminAuthHeaders(headersList: Headers): Record<string, string> {
  const password = process.env.NEXTCLOUD_ADMIN_PASSWORD ?? ""
  const token = Buffer.from(`admin:${password}`).toString("base64")
  const realUser = headersList.get("x-authentik-username") || ""
  return {
    Authorization: `Basic ${token}`,
    "X-Authentik-Username": "admin",
    "X-Authentik-Groups": headersList.get("x-authentik-groups") || "",
    "X-Authentik-Name": "Administrator",
    "X-Real-Username": realUser,
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ calendarUri: string; eventUid: string }> }
) {
  const headersList = await headers()
  if (!getUser(headersList)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { calendarUri, eventUid } = await params

  try {
    const body = await request.json()
    const { status, data } = await nextcloudRequest(
      "PUT",
      `/apps/skymasonsnav/api/calendar/${calendarUri}/events/${eventUid}`,
      adminAuthHeaders(headersList),
      JSON.stringify(body)
    )
    return NextResponse.json(data, { status })
  } catch (error) {
    console.error("Failed to update event:", error)
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ calendarUri: string; eventUid: string }> }
) {
  const headersList = await headers()
  if (!getUser(headersList)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { calendarUri, eventUid } = await params

  try {
    const { status, data } = await nextcloudRequest(
      "DELETE",
      `/apps/skymasonsnav/api/calendar/${calendarUri}/events/${eventUid}`,
      adminAuthHeaders(headersList)
    )
    return NextResponse.json(data, { status })
  } catch (error) {
    console.error("Failed to delete event:", error)
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 })
  }
}
