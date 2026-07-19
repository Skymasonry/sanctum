import { headers } from "next/headers"
import { fetchFromNextcloud } from "./api"

export interface CalendarEvent {
  uid: string
  title: string
  start: string
  end: string | null
  allDay?: boolean
  location?: string
  description?: string
  recurrence?: string
  status?: string
  categories?: string
  links?: Array<{ type: string; label: string; url: string }>
}

async function getAdminReadHeaders(): Promise<Record<string, string>> {
  const headersList = await headers()
  const username = headersList.get("x-authentik-username")
  if (!username) throw new Error("Unauthorized")
  return {
    "X-Authentik-Username": "admin",
    "X-Authentik-Groups": headersList.get("x-authentik-groups") || "",
    "X-Authentik-Name": "Administrator",
    "X-Real-Username": username,
  }
}

export async function getEvents(calendarUri: string): Promise<CalendarEvent[]> {
  try {
    const authHeaders = await getAdminReadHeaders()
    return await fetchFromNextcloud(
      `/apps/skymasonsnav/api/calendar/${calendarUri}/events`,
      { headers: authHeaders }
    )
  } catch (error) {
    console.error("Failed to fetch calendar events:", error)
    return []
  }
}
