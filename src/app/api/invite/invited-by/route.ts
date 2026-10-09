import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { fetchAccountAPI } from "@/lib/account-api"

/**
 * GET /api/invite/invited-by?user=<username> — who invited that user.
 * Omit ?user to ask about yourself. Shown on profile pages, so any
 * authenticated member can ask about any target (matches the public
 * "Seeded by" convention elsewhere — not sensitive).
 */
export async function GET(request: NextRequest) {
  const headersList = await headers()
  const username = headersList.get("x-authentik-username")
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const target = request.nextUrl.searchParams.get("user")
  const path = target
    ? `/api/invite/invited-by?user=${encodeURIComponent(target)}`
    : "/api/invite/invited-by"

  try {
    const data = await fetchAccountAPI(path, { "X-Authentik-Username": username })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({})
  }
}
