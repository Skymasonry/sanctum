import { NextResponse, NextRequest } from "next/server"

import { getScroll, submitScroll } from "@/lib/scrolls"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * POST /api/public/scrolls/[scrollId]/submissions — no auth.
 *
 * For someone who's been sent an application link but doesn't have a
 * Sanctum account yet. Identity is whatever they type in (name/email
 * questions), not an Authentik session — so this can't auto-join them
 * to a guild the way the authenticated submissions route does. They
 * still need to go through the normal invite flow to get an account;
 * the seeder reviewing submissions is the reconciliation point.
 *
 * `website` is an anti-bot honeypot: a real applicant never fills it
 * in (it's not rendered visibly), so a non-empty value means a bot
 * filled every field it could find. We accept the request either way
 * so the bot doesn't learn anything, but don't persist it.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scrollId: string }> },
) {
  const { scrollId } = await params
  const scroll = await getScroll(scrollId)
  if (!scroll || !scroll.publicAccess || !scroll.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    email?: string
    answers?: Record<string, unknown>
    website?: string
  }

  if (body.website) {
    return NextResponse.json({ submission: null })
  }

  if (!body.email || !EMAIL_RE.test(body.email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
  }
  if (!body.answers) {
    return NextResponse.json({ error: "answers required" }, { status: 400 })
  }

  const missing = scroll.questions.some(q => {
    if (!q.required) return false
    const v = body.answers![q.id]
    return v === undefined || v === null || v === ""
  })
  if (missing) {
    return NextResponse.json({ error: "Please answer all required questions" }, { status: 400 })
  }

  const submission = await submitScroll(scrollId, null, body.email, body.answers)
  return NextResponse.json({ submission })
}
