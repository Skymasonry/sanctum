import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { deleteQuestion, updateQuestion, type QuestionType } from "@/lib/scrolls"

async function username(): Promise<string | null> {
  const h = await headers()
  return h.get("x-authentik-username")
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> },
) {
  if (!(await username())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { questionId } = await params
  const body = (await req.json().catch(() => ({}))) as {
    text?: string; type?: QuestionType; required?: boolean; options?: string[]
  }
  const ok = await updateQuestion(questionId, body)
  return NextResponse.json({ success: ok })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> },
) {
  if (!(await username())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { questionId } = await params
  const ok = await deleteQuestion(questionId)
  return NextResponse.json({ success: ok })
}
