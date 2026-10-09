import { NextResponse, NextRequest } from "next/server"

import { getScroll } from "@/lib/scrolls"

/**
 * GET /api/public/scrolls/[scrollId] — no auth. Only serves the scroll
 * if the seeder has explicitly flagged it publicAccess + published.
 * Caddy also excludes this path from forward_auth (see the neo
 * Caddyfile's @public_scrolls matcher) — this check is the second,
 * app-level gate so a scroll can't become reachable here just because
 * someone hits the right URL; it has to be opted in twice.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ scrollId: string }> },
) {
  const { scrollId } = await params
  const scroll = await getScroll(scrollId)
  if (!scroll || !scroll.publicAccess || !scroll.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ scroll })
}
