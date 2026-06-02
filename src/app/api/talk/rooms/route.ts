import { getRooms } from "@/lib/talk"
import { NextResponse } from "next/server"

export async function GET() {
  const rooms = await getRooms()
  return NextResponse.json(rooms)
}
