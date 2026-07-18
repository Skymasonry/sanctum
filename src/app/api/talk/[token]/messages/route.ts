import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { getMessages } from "@/lib/talk"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const h = await headers()
  if (!h.get("x-authentik-username")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { token } = await params
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? "50"), 50)

  try {
    const messages = await getMessages(token, limit)
    return NextResponse.json(messages)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
