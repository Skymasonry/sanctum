import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { fetchFromNextcloud } from "@/lib/api"

interface SearchResult {
  username: string
  name: string
}

/**
 * GET /api/users/search?q=<query> — proxies skymasonsnav's user
 * search (Nextcloud's own user directory). Used for name-picking UIs
 * that need someone regardless of guild membership — Leadership
 * Circle, at creation time before a guild has any members at all.
 */
export async function GET(request: NextRequest) {
  const h = await headers()
  const username = h.get("x-authentik-username")
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const q = request.nextUrl.searchParams.get("q") ?? ""
  if (q.trim().length < 2) return NextResponse.json({ users: [] })

  try {
    const results = await fetchFromNextcloud<SearchResult[]>(
      `/apps/skymasonsnav/api/users/search?q=${encodeURIComponent(q)}`,
      { headers: { "X-Authentik-Username": username } },
    )
    return NextResponse.json({ users: Array.isArray(results) ? results : [] })
  } catch (err) {
    console.error("user search failed:", err)
    return NextResponse.json({ users: [] })
  }
}
