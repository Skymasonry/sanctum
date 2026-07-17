import { headers } from "next/headers"

import { db } from "./db"
import type { ChamberId, Guild, GuildApplication } from "@/types/guild"

const ALL_CHAMBERS: ChamberId[] = ["pulse", "chamber", "rites", "quests", "scrolls", "archive", "brotherhood"]

/**
 * Native Sanctum membership layer (Slice 1 of the rebuild).
 *
 * Reads live from the `sanctum` Postgres database. During transition,
 * write paths still tell the skymasonsnav app to run syncGuildAccess so
 * Nextcloud Group / Talk / share state tracks the DB. That layer goes
 * away once the chambers themselves are native (Slices 2+).
 */

interface GuildRow {
  id: string
  name: string
  description: string
  icon: string
  color: string
  admission: "open" | "closed" | "mandatory"
  category: string
  pattern_integrity: string
  evolutionary_purpose: string
  seeder_uid: string
  created_at: Date
  talk_room: string | null
  calendar_uri: string | null
  folder_id: number | null
  folder_name: string | null
  deck_board_id: number | null
  group_name: string | null
  chambers: string[] | null
}

function rowToGuild(row: GuildRow, members: string[], pending: string[], applications: GuildApplication[], agreements: Array<{ id: number; text: string }>): Guild {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    admission: row.admission,
    seederUid: row.seeder_uid,
    members,
    pending,
    applications,
    memberCount: members.length,
    category: row.category,
    patternIntegrity: row.pattern_integrity,
    evolutionaryPurpose: row.evolutionary_purpose,
    createdAt: row.created_at.toISOString(),
    circleId: "",
    chambers: (row.chambers && row.chambers.length > 0
      ? (row.chambers.filter(c => ALL_CHAMBERS.includes(c as ChamberId)) as ChamberId[])
      : ALL_CHAMBERS),
    applicationForm: { agreements },
    resources: {
      talkRoom: row.talk_room,
      calendarUri: row.calendar_uri ?? undefined,
      folderId: row.folder_id ?? undefined,
      folderName: row.folder_name ?? undefined,
      deckBoardId: row.deck_board_id ?? undefined,
    },
  }
}

/**
 * Load every guild + its members + pending applications + application
 * form agreements in bounded round-trips (no N+1).
 */
async function loadGuilds(where: string, params: unknown[] = []): Promise<Guild[]> {
  const guilds = await db.query<GuildRow>(
    `SELECT * FROM guilds ${where} ORDER BY name`,
    params,
  )
  if (guilds.rowCount === 0) return []

  const ids = guilds.rows.map(g => g.id)
  const [members, apps, forms] = await Promise.all([
    db.query<{ guild_id: string; user_id: string }>(
      `SELECT guild_id, user_id FROM guild_members WHERE guild_id = ANY($1::text[])`,
      [ids],
    ),
    db.query<{ guild_id: string; user_id: string; message: string; agreements: unknown; applied_at: Date; status: string }>(
      `SELECT guild_id, user_id, message, agreements, applied_at, status
       FROM guild_applications
       WHERE guild_id = ANY($1::text[]) AND status = 'pending'`,
      [ids],
    ),
    db.query<{ guild_id: string; agreements: unknown }>(
      `SELECT guild_id, agreements FROM guild_application_forms WHERE guild_id = ANY($1::text[])`,
      [ids],
    ),
  ])

  const membersByGuild = new Map<string, string[]>()
  for (const m of members.rows) {
    const list = membersByGuild.get(m.guild_id) ?? []
    list.push(m.user_id)
    membersByGuild.set(m.guild_id, list)
  }

  const pendingByGuild = new Map<string, string[]>()
  const appsByGuild = new Map<string, GuildApplication[]>()
  for (const a of apps.rows) {
    const p = pendingByGuild.get(a.guild_id) ?? []
    p.push(a.user_id)
    pendingByGuild.set(a.guild_id, p)
    const arr = appsByGuild.get(a.guild_id) ?? []
    arr.push({
      userId: a.user_id,
      message: a.message,
      agreements: Array.isArray(a.agreements) ? a.agreements as GuildApplication["agreements"] : [],
      appliedAt: a.applied_at.toISOString(),
    })
    appsByGuild.set(a.guild_id, arr)
  }

  const agreementsByGuild = new Map<string, Array<{ id: number; text: string }>>()
  for (const f of forms.rows) {
    agreementsByGuild.set(
      f.guild_id,
      Array.isArray(f.agreements) ? f.agreements as Array<{ id: number; text: string }> : [],
    )
  }

  return guilds.rows.map(row =>
    rowToGuild(
      row,
      membersByGuild.get(row.id) ?? [],
      pendingByGuild.get(row.id) ?? [],
      appsByGuild.get(row.id) ?? [],
      agreementsByGuild.get(row.id) ?? [],
    ),
  )
}

/**
 * Return EVERY guild — for surfaces that intentionally expose all of
 * them (Discover). Never expose the raw result through a per-user API.
 */
export async function getAllGuildsUnfiltered(): Promise<Guild[]> {
  const h = await headers()
  if (!h.get("x-authentik-username")) return []
  return loadGuilds("")
}

/**
 * Return guilds the current caller is a member of. Case-insensitive
 * username match against guild_members. Also includes mandatory guilds
 * they haven't yet been added to (Brotherhood auto-membership).
 */
export async function getUserGuilds(): Promise<Guild[]> {
  const h = await headers()
  const username = h.get("x-authentik-username")
  if (!username) return []

  return loadGuilds(
    `WHERE id IN (
       SELECT guild_id FROM guild_members WHERE lower(user_id) = lower($1)
     ) OR admission = 'mandatory'`,
    [username],
  )
}

/**
 * Return a specific guild if the caller is a member — otherwise null.
 * Two "not visible" states collapse to null on purpose.
 */
export async function getGuild(guildId: string): Promise<Guild | null> {
  const guilds = await getUserGuilds()
  return guilds.find(g => g.id === guildId) ?? null
}
