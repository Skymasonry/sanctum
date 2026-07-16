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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const auth = await getAuthHeaders()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { guildId } = await params
  const username = auth["X-Authentik-Username"]

  const url = new URL(request.url)
  const action = url.searchParams.get("action")
  if (!action) {
    return NextResponse.json({ error: "Action required" }, { status: 400 })
  }

  const { addMember, applyToGuild, approveApplication, joinGuild, rejectApplication, removeMember } =
    await import("@/lib/guild-writes")

  try {
    switch (action) {
      case "join": {
        const ok = await joinGuild(guildId, username, auth)
        return NextResponse.json({ success: ok })
      }
      case "leave": {
        const ok = await removeMember(guildId, username, auth)
        return NextResponse.json({ success: ok })
      }
      case "apply": {
        const body = await request.json().catch(() => ({} as { message?: string; agreements?: Array<{ id: number; text: string; agreed?: boolean }> }))
        const ok = await applyToGuild(guildId, username, body.message ?? "", body.agreements ?? [])
        return NextResponse.json({ success: ok })
      }
      case "approve":
      case "reject": {
        const body = (await request.json().catch(() => ({}))) as { memberId?: string }
        if (!body.memberId) {
          return NextResponse.json({ error: "memberId required" }, { status: 400 })
        }
        const ok = action === "approve"
          ? await approveApplication(guildId, body.memberId, auth)
          : await rejectApplication(guildId, body.memberId)
        if (action === "approve" && ok) {
          // approveApplication adds the member itself; addMember not needed
        } else if (!ok) {
          return NextResponse.json({ error: "Application not found" }, { status: 404 })
        }
        return NextResponse.json({ success: ok })
      }
      case "invite": {
        const body = (await request.json().catch(() => ({}))) as { members?: string[] }
        const added: string[] = []
        for (const m of body.members ?? []) {
          if (await addMember(guildId, m, auth)) added.push(m)
        }
        return NextResponse.json({ success: true, added })
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Failed guild action:", error)
    return NextResponse.json({ error: "Action failed" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> },
) {
  const auth = await getAuthHeaders()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { guildId } = await params

  const { getGuild } = await import("@/lib/guilds")
  const { updateGuildInfo } = await import("@/lib/guild-writes")

  const guild = await getGuild(guildId)
  if (!guild) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (auth["X-Authentik-Username"].toLowerCase() !== guild.seederUid.toLowerCase()) {
    return NextResponse.json({ error: "Seeder only" }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string
    description?: string
    icon?: string
    color?: string
    admission?: "open" | "closed" | "mandatory"
  }
  const ok = await updateGuildInfo(guildId, body)
  if (!ok) return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const auth = await getAuthHeaders()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { guildId } = await params

  try {
    const body = await request.json()
    const data = await ncRequest(
      "PUT",
      `/apps/skymasonsnav/api/orders/${guildId}`,
      auth,
      JSON.stringify(body)
    )
    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to update guild:", error)
    return NextResponse.json({ error: "Failed to update guild" }, { status: 500 })
  }
}
