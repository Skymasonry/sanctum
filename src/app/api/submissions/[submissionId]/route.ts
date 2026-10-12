import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { getGuild } from "@/lib/guilds"
import { deleteSubmission, getSubmission } from "@/lib/scrolls"
import { canReviewSubmissions } from "@/types/guild"

async function getUsername(): Promise<string | null> {
  const h = await headers()
  return h.get("x-authentik-username")
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const username = await getUsername()
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { submissionId } = await params
  const submission = await getSubmission(submissionId)
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const guild = await getGuild(submission.guildId)
  if (!guild || !canReviewSubmissions(guild, username)) {
    return NextResponse.json({ error: "Leadership Circle or manager only" }, { status: 403 })
  }

  const deleted = await deleteSubmission(submissionId)
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
