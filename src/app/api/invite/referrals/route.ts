import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { fetchAccountAPI } from "@/lib/account-api"

/**
 * GET /api/invite/referrals?user=<username> — who that user invited.
 * Omit ?user to ask about yourself.
 */
export async function GET(request: NextRequest) {
  const headersList = await headers()
  const username = headersList.get("x-authentik-username")
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const target = request.nextUrl.searchParams.get("user")
  const path = target
    ? `/api/invite/referrals?user=${encodeURIComponent(target)}`
    : "/api/invite/referrals"

  try {
    const data = await fetchAccountAPI(path, { "X-Authentik-Username": username })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ referrals: [], count: 0 })
  }
}
