import { headers } from "next/headers"
import { NextResponse, NextRequest } from "next/server"

import { addQuestion, type QuestionType } from "@/lib/scrolls"

async function username(): Promise<string | null> {
  const h = await headers()
  return h.get("x-authentik-username")
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scrollId: string }> },
) {
  if (!(await username())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { scrollId } = await params
  const body = (await req.json().catch(() => ({}))) as {
    text?: string; type?: QuestionType; required?: boolean; options?: string[]
  }
  if (!body.text?.trim()) return NextResponse.json({ error: "Text required" }, { status: 400 })
  const q = await addQuestion(scrollId, {
    text: body.text.trim(),
    type: body.type,
    required: body.required,
    options: body.options,
  })
  return NextResponse.json({ question: q })
}
