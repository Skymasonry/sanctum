import { headers } from "next/headers"
import { fetchFromNextcloud } from "./api"
import type { Guild } from "@/types/guild"

/**
 * Return EVERY guild in orders.json — private or otherwise.
 *
 * Only use this on surfaces that intentionally expose guilds the caller
 * isn't a member of (currently: Discover). Never return the result of
 * this directly through a per-user API. If you're writing a new caller,
 * you almost certainly want getUserGuilds().
 */
export async function getAllGuildsUnfiltered(): Promise<Guild[]> {
  const headersList = await headers()
  const username = headersList.get("x-authentik-username")
  const groups = headersList.get("x-authentik-groups")
  const name = headersList.get("x-authentik-name")

  if (!username) return []

  try {
    const data = await fetchFromNextcloud("/apps/skymasonsnav/api/orders", {
      headers: {
        "X-Authentik-Username": username,
        "X-Authentik-Groups": groups || "",
        "X-Authentik-Name": name || "",
      },
    })
    return data.orders || []
  } catch (error) {
    console.error("Error fetching guilds:", error)
    return []
  }
}

/**
 * Return the guilds the current caller is a member of, per orders.json.
 * This is the canonical read model for per-user surfaces (Sidebar,
 * Threshold dashboard, guild pages, etc). Case-insensitive membership
 * match — orders.json stores real usernames, Authentik headers may
 * arrive in the same case but treating it case-loose costs nothing.
 *
 * Also includes guilds with admission="mandatory" that the caller
 * hasn't been auto-joined to yet, so the Sidebar reflects them
 * immediately after signup.
 */
export async function getUserGuilds(): Promise<Guild[]> {
  const headersList = await headers()
  const username = headersList.get("x-authentik-username")
  if (!username) return []

  const nameLc = username.toLowerCase()
  const all = await getAllGuildsUnfiltered()
  return all.filter(g =>
    g.members.some(m => m.toLowerCase() === nameLc) ||
    g.admission === "mandatory",
  )
}

/**
 * Return a specific guild if the caller is a member. Returns null both
 * when the guild doesn't exist AND when the caller isn't in it — the
 * two states are indistinguishable to the caller by design (don't leak
 * existence of guilds you're not in).
 */
export async function getGuild(guildId: string): Promise<Guild | null> {
  const guilds = await getUserGuilds()
  return guilds.find(o => o.id === guildId) || null
}
