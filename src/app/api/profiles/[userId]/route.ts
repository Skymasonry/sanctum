import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { getProfile, updateProfile } from "@/lib/profiles"

async function currentUser(): Promise<string | null> {
  const h = await headers()
  return h.get("x-authentik-username")
}

async function currentName(): Promise<string | null> {
  const h = await headers()
  return h.get("x-authentik-name")
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  if (!(await currentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { userId } = await params
  // Hint the display name from Authentik if this is the caller looking
  // at their own profile — makes the auto-created row nicer.
  const caller = await currentUser()
  const name = await currentName()
  const hint = caller === userId && name ? name : undefined
  const profile = await getProfile(userId, hint)
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ profile })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const caller = await currentUser()
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { userId } = await params
  if (caller !== userId) {
    return NextResponse.json({ error: "Can only edit your own profile" }, { status: 403 })
  }
  const body = (await req.json().catch(() => ({}))) as {
    displayName?: string
    bio?: string
    contact?: Record<string, unknown>
    visible?: boolean
  }
  const updated = await updateProfile(userId, body)
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ profile: updated })
}
