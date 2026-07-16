import { headers } from "next/headers"
import { fetchFromNextcloud } from "./api"

export interface DeckStack {
  id: number
  title: string
  order: number
  cards: DeckCard[]
}

export interface DeckCard {
  id: number
  title: string
  description: string
  order: number
  duedate: string | null
  assignedUsers: string[]
  labels: DeckLabel[]
  commentsCount: number
}

export interface DeckLabel {
  id: number
  title: string
  color: string
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headersList = await headers()
  const username = headersList.get("x-authentik-username")
  const groups = headersList.get("x-authentik-groups")
  const name = headersList.get("x-authentik-name")

  if (!username) {
    throw new Error("Unauthorized")
  }

  return {
    "X-Authentik-Username": username,
    "X-Authentik-Groups": groups || "",
    "X-Authentik-Name": name || "",
  }
}

export async function getStacks(boardId: number): Promise<DeckStack[]> {
  try {
    const authHeaders = await getAuthHeaders()
    const data = await fetchFromNextcloud<{ stacks?: DeckStack[] }>(
      `/apps/skymasonsnav/api/deck/${boardId}/stacks`,
      { headers: authHeaders }
    )
    return data.stacks || []
  } catch (error) {
    console.error("Failed to fetch deck stacks:", error)
    return []
  }
}
