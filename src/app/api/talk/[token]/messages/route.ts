import { getMessages } from "@/lib/talk"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? "50")
  const messages = await getMessages(token, Math.min(limit, 100))
  return NextResponse.json(messages)
}
