import { NextResponse, NextRequest } from "next/server"

import { getUser } from "@/lib/auth"
import {
  FROM_SKY_TO_STONE_SLUG,
  getApplication,
  upsertApplication,
  type FromSkyToStoneAnswers,
} from "@/lib/event-applications"

/**
 * GET  — the current user's existing application, if any (used to
 *        prefill the form for someone re-visiting or editing).
 * POST — create or update the current user's application.
 *
 * Both require an authenticated Sanctum session. There's no
 * unauthenticated path here: a brand-new applicant has to complete
 * account creation (via their invite link) before they can reach this
 * route at all, same as every other page in the app.
 */
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const application = await getApplication(FROM_SKY_TO_STONE_SLUG, user.username)
  return NextResponse.json({ application })
}

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => null)) as
    | { answers?: Partial<FromSkyToStoneAnswers>; agreed?: boolean }
    | null
  if (!body || !body.answers) {
    return NextResponse.json({ error: "answers required" }, { status: 400 })
  }
  if (!body.agreed) {
    return NextResponse.json({ error: "You need to agree to the terms to submit" }, { status: 400 })
  }

  try {
    const application = await upsertApplication(
      FROM_SKY_TO_STONE_SLUG,
      user.username,
      body.answers as FromSkyToStoneAnswers,
      body.agreed,
    )
    return NextResponse.json({ application })
  } catch (err) {
    console.error("Failed to save event application:", err)
    return NextResponse.json({ error: "Failed to save application" }, { status: 500 })
  }
}
