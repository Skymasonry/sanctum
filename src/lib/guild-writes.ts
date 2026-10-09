import { db } from "./db"
import { postToNextcloud } from "./api"
import type { ChamberId, Guild } from "@/types/guild"

const ALL_CHAMBERS: ChamberId[] = ["pulse", "chamber", "rites", "quests", "scrolls", "archive", "brotherhood"]

/**
 * Native Sanctum write helpers for guilds.
 *
 * Every write:
 *   1. mutates Postgres inside a transaction
 *   2. asks skymasonsnav to run syncGuildAccess so the Nextcloud
 *      primitives (Group / Talk / shares) match the new state
 *
 * The syncGuildAccess call still reads orders.json today. During Slice
 * 1's transition it also gets updated via a compat shim on the PHP
 * side. Once chambers migrate to native primitives (Slices 2+),
 * syncGuildAccess disappears.
 */

async function syncGuildInNextcloud(
  guildId: string,
  authHeaders: Record<string, string>,
  opts: { delete?: boolean } = {},
): Promise<void> {
  try {
    await postToNextcloud(
      `/apps/skymasonsnav/api/orders/${guildId}/sync`,
      opts,
      { headers: authHeaders },
    )
  } catch (err) {
    // Sync failure is non-fatal: DB is truth. Log and move on so writes
    // don't roll back on a Nextcloud hiccup.
    console.error(`syncGuildAccess for ${guildId} failed:`, err)
  }
}

export type SpaceType = "chat" | "calendar" | "folder"

export interface ProvisionSpaceResult {
  talkRoom?: string
  calendarUri?: string
  folderId?: number
  folderName?: string
}

/**
 * Pull a value out of skymasonsnav's response by trying a few plausible
 * key names/shapes. The PHP app predates the native Postgres layer and
 * its response shape isn't documented anywhere in this repo, so this
 * stays defensive rather than assuming one exact contract.
 */
function extractSpaceResult(type: SpaceType, raw: unknown): ProvisionSpaceResult {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const nested = (key: string): Record<string, unknown> =>
    (obj[key] && typeof obj[key] === "object" ? (obj[key] as Record<string, unknown>) : {})

  // Confirmed actual shape (from server logs): { success, space: {...} }.
  // The other lookups are kept as fallbacks in case that ever changes.
  const space = nested("space")

  if (type === "chat") {
    const token = space.talkRoom ?? obj.talkRoom ?? obj.token ?? obj.roomToken ?? nested("room").token
    return typeof token === "string" && token ? { talkRoom: token } : {}
  }
  if (type === "calendar") {
    const uri = space.calendarUri ?? obj.calendarUri ?? obj.uri ?? nested("calendar").uri
    return typeof uri === "string" && uri ? { calendarUri: uri } : {}
  }
  const folder = nested("folder")
  const id = space.folderId ?? obj.folderId ?? folder.id
  const name = space.folderName ?? obj.folderName ?? folder.name
  return {
    ...(typeof id === "number" ? { folderId: id } : {}),
    ...(typeof name === "string" && name ? { folderName: name } : {}),
  }
}

/**
 * Provision (or re-fetch) a chamber's underlying Nextcloud resource via
 * skymasonsnav, then persist whatever comes back onto the guild row.
 *
 * Previously the API route only proxied skymasonsnav's response to the
 * client without saving it — the resource would (maybe) get created in
 * Nextcloud, but Postgres never learned its id, so the chamber looked
 * "unprovisioned" forever after refresh. This is now the single place
 * that both calls skymasonsnav and writes the result back.
 */
export async function provisionSpace(
  guildId: string,
  type: SpaceType,
  authHeaders: Record<string, string>,
): Promise<ProvisionSpaceResult> {
  const raw = await postToNextcloud(
    `/apps/skymasonsnav/api/orders/${guildId}/spaces`,
    { type },
    { headers: authHeaders },
  )
  const result = extractSpaceResult(type, raw)
  if (Object.keys(result).length === 0) {
    console.error(`provisionSpace(${guildId}, ${type}): couldn't find a usable field in response`, raw)
    return result
  }

  const sets: string[] = []
  const params: unknown[] = []
  let n = 1
  if (result.talkRoom !== undefined) { sets.push(`talk_room = $${n++}`); params.push(result.talkRoom) }
  if (result.calendarUri !== undefined) { sets.push(`calendar_uri = $${n++}`); params.push(result.calendarUri) }
  if (result.folderId !== undefined) { sets.push(`folder_id = $${n++}`); params.push(result.folderId) }
  if (result.folderName !== undefined) { sets.push(`folder_name = $${n++}`); params.push(result.folderName) }
  params.push(guildId)
  await db.query(`UPDATE guilds SET ${sets.join(", ")} WHERE id = $${n}`, params)

  return result
}

export interface CreateGuildInput {
  name: string
  description?: string
  icon?: string
  color?: string
  admission?: "open" | "closed" | "mandatory"
  category?: string
  patternIntegrity?: string
  evolutionaryPurpose?: string
  chambers?: ChamberId[]
  applicationForm?: { agreements: Array<{ id: number; text: string }> }
  inviteMembers?: string[]
  /** Optional at creation — named "other masons," not required to seed a guild. */
  leadershipCircle?: string[]
}

/**
 * Build a URL-safe guild id from the name, deduped against existing.
 */
async function generateGuildId(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  const existing = await db.query<{ id: string }>(
    `SELECT id FROM guilds WHERE id = $1 OR id LIKE $2`,
    [base, `${base}-%`],
  )
  const taken = new Set(existing.rows.map(r => r.id))
  if (!taken.has(base)) return base
  let n = 1
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

export async function createGuild(
  seederUid: string,
  input: CreateGuildInput,
  authHeaders: Record<string, string>,
): Promise<string> {
  const id = await generateGuildId(input.name)
  const members = [seederUid, ...(input.inviteMembers ?? []).filter(m => m !== seederUid)]

  const chambers: ChamberId[] = (input.chambers ?? ALL_CHAMBERS).filter(c =>
    ALL_CHAMBERS.includes(c),
  )

  await db.query("BEGIN")
  try {
    await db.query(
      `INSERT INTO guilds (
         id, name, description, icon, color, admission, category,
         pattern_integrity, evolutionary_purpose, seeder_uid, group_name, chambers
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$1,$11::text[])`,
      [
        id,
        input.name,
        input.description ?? "",
        input.icon ?? "⬡",
        input.color ?? "#c9a227",
        input.admission ?? "open",
        input.category ?? "social",
        input.patternIntegrity ?? "",
        input.evolutionaryPurpose ?? "",
        seederUid,
        chambers,
      ],
    )
    for (const uid of members) {
      await db.query(
        `INSERT INTO guild_members (guild_id, user_id, role) VALUES ($1, $2, $3)`,
        [id, uid, uid === seederUid ? "seeder" : "member"],
      )
    }
    if (input.applicationForm) {
      await db.query(
        `INSERT INTO guild_application_forms (guild_id, agreements) VALUES ($1, $2::jsonb)`,
        [id, JSON.stringify(input.applicationForm.agreements ?? [])],
      )
    }
    // The seeder starts as a steward too — otherwise a brand-new guild
    // would launch with nobody able to manage it until someone edits
    // the DB directly. They (or any steward) can add/remove from there.
    await db.query(
      `INSERT INTO guild_stewards (guild_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [id, seederUid],
    )
    for (const uid of input.leadershipCircle ?? []) {
      await db.query(
        `INSERT INTO guild_leadership_circle (guild_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [id, uid],
      )
    }
    await db.query("COMMIT")
  } catch (err) {
    await db.query("ROLLBACK")
    throw err
  }

  await syncGuildInNextcloud(id, authHeaders)

  // Auto-populate chat + calendar so a fresh guild isn't a wall of
  // "unprovisioned" chambers. Best-effort: a Nextcloud hiccup here
  // shouldn't fail guild creation — the seeder can still provision
  // manually from the chamber if this doesn't land.
  const autoProvision: Array<[ChamberId, SpaceType]> = [
    ["pulse", "chat"],
    ["rites", "calendar"],
  ]
  for (const [chamber, spaceType] of autoProvision) {
    if (!chambers.includes(chamber)) continue
    try {
      await provisionSpace(id, spaceType, authHeaders)
    } catch (err) {
      console.error(`auto-provision ${spaceType} for ${id} failed:`, err)
    }
  }

  return id
}

export async function addMember(
  guildId: string,
  userId: string,
  authHeaders: Record<string, string>,
): Promise<boolean> {
  const res = await db.query(
    `INSERT INTO guild_members (guild_id, user_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [guildId, userId],
  )
  await db.query(
    `DELETE FROM guild_applications WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId],
  )
  if ((res.rowCount ?? 0) > 0) {
    await syncGuildInNextcloud(guildId, authHeaders)
    return true
  }
  return false
}

export async function removeMember(
  guildId: string,
  userId: string,
  authHeaders: Record<string, string>,
): Promise<boolean> {
  const res = await db.query(
    `DELETE FROM guild_members WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId],
  )
  if ((res.rowCount ?? 0) > 0) {
    await syncGuildInNextcloud(guildId, authHeaders)
    return true
  }
  return false
}

/**
 * Open-join: only allowed for open + mandatory guilds. Returns true on
 * added, false if already a member or admission requires an application.
 */
export async function joinGuild(
  guildId: string,
  userId: string,
  authHeaders: Record<string, string>,
): Promise<boolean> {
  const guild = await db.query<Pick<Guild, "admission">>(
    `SELECT admission FROM guilds WHERE id = $1`,
    [guildId],
  )
  if (guild.rowCount === 0) return false
  const admission = guild.rows[0].admission
  if (admission !== "open" && admission !== "mandatory") return false
  return addMember(guildId, userId, authHeaders)
}

export async function applyToGuild(
  guildId: string,
  userId: string,
  message: string,
  agreements: Array<{ id: number; text: string; agreed?: boolean }>,
): Promise<boolean> {
  const guild = await db.query<Pick<Guild, "admission">>(
    `SELECT admission FROM guilds WHERE id = $1`,
    [guildId],
  )
  if (guild.rowCount === 0 || guild.rows[0].admission === "open") return false

  const res = await db.query(
    `INSERT INTO guild_applications (guild_id, user_id, message, agreements)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (guild_id, user_id) DO UPDATE SET
       message = EXCLUDED.message,
       agreements = EXCLUDED.agreements,
       status = 'pending',
       applied_at = NOW(),
       resolved_at = NULL`,
    [guildId, userId, message, JSON.stringify(agreements)],
  )
  return (res.rowCount ?? 0) > 0
}

export async function approveApplication(
  guildId: string,
  applicantId: string,
  authHeaders: Record<string, string>,
): Promise<boolean> {
  await db.query("BEGIN")
  try {
    const app = await db.query(
      `UPDATE guild_applications
         SET status = 'approved', resolved_at = NOW()
       WHERE guild_id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING id`,
      [guildId, applicantId],
    )
    if (app.rowCount === 0) {
      await db.query("ROLLBACK")
      return false
    }
    await db.query(
      `INSERT INTO guild_members (guild_id, user_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [guildId, applicantId],
    )
    await db.query("COMMIT")
  } catch (err) {
    await db.query("ROLLBACK")
    throw err
  }
  await syncGuildInNextcloud(guildId, authHeaders)
  return true
}

export async function rejectApplication(
  guildId: string,
  applicantId: string,
): Promise<boolean> {
  const res = await db.query(
    `UPDATE guild_applications
       SET status = 'rejected', resolved_at = NOW()
     WHERE guild_id = $1 AND user_id = $2 AND status = 'pending'`,
    [guildId, applicantId],
  )
  return (res.rowCount ?? 0) > 0
}

export interface UpdateGuildInfoInput {
  name?: string
  description?: string
  icon?: string
  color?: string
  admission?: "open" | "closed" | "mandatory"
  evolutionaryPurpose?: string
  patternIntegrity?: string
}

/**
 * Update editable guild fields. Seeder-only, gated by the caller.
 */
export async function updateGuildInfo(
  guildId: string,
  patch: UpdateGuildInfoInput,
): Promise<boolean> {
  const sets: string[] = []
  const params: unknown[] = []
  let n = 1
  if (patch.name !== undefined) { sets.push(`name = $${n++}`); params.push(patch.name) }
  if (patch.description !== undefined) { sets.push(`description = $${n++}`); params.push(patch.description) }
  if (patch.icon !== undefined) { sets.push(`icon = $${n++}`); params.push(patch.icon) }
  if (patch.color !== undefined) { sets.push(`color = $${n++}`); params.push(patch.color) }
  if (patch.admission !== undefined) { sets.push(`admission = $${n++}`); params.push(patch.admission) }
  if (patch.evolutionaryPurpose !== undefined) { sets.push(`evolutionary_purpose = $${n++}`); params.push(patch.evolutionaryPurpose) }
  if (patch.patternIntegrity !== undefined) { sets.push(`pattern_integrity = $${n++}`); params.push(patch.patternIntegrity) }
  if (sets.length === 0) return false
  params.push(guildId)
  const res = await db.query(
    `UPDATE guilds SET ${sets.join(", ")} WHERE id = $${n}`,
    params,
  )
  return (res.rowCount ?? 0) > 0
}

/**
 * Update the enabled chambers list for a guild. Seeder-only, gated by
 * the caller.
 */
export async function updateGuildChambers(
  guildId: string,
  chambers: ChamberId[],
): Promise<boolean> {
  const clean = chambers.filter(c => ALL_CHAMBERS.includes(c))
  const res = await db.query(
    `UPDATE guilds SET chambers = $2::text[] WHERE id = $1`,
    [guildId, clean],
  )
  return (res.rowCount ?? 0) > 0
}

/**
 * Add a steward — idempotent, any number allowed. Unlike seederUid
 * (single, set at creation), stewardship is a plain many-to-many table
 * so it can be granted/revoked freely by whoever currently manages the
 * guild (seeder or an existing steward — enforced by the caller).
 */
export async function addSteward(guildId: string, userId: string): Promise<boolean> {
  const res = await db.query(
    `INSERT INTO guild_stewards (guild_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [guildId, userId],
  )
  return (res.rowCount ?? 0) > 0
}

export async function removeSteward(guildId: string, userId: string): Promise<boolean> {
  const res = await db.query(
    `DELETE FROM guild_stewards WHERE guild_id = $1 AND lower(user_id) = lower($2)`,
    [guildId, userId],
  )
  return (res.rowCount ?? 0) > 0
}

/**
 * Leadership Circle add/remove — unlike stewards, only a guild manager
 * (seeder/steward) can call these; the circle itself doesn't self-govern.
 */
export async function addLeadershipCircleMember(guildId: string, userId: string): Promise<boolean> {
  const res = await db.query(
    `INSERT INTO guild_leadership_circle (guild_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [guildId, userId],
  )
  return (res.rowCount ?? 0) > 0
}

export async function removeLeadershipCircleMember(guildId: string, userId: string): Promise<boolean> {
  const res = await db.query(
    `DELETE FROM guild_leadership_circle WHERE guild_id = $1 AND lower(user_id) = lower($2)`,
    [guildId, userId],
  )
  return (res.rowCount ?? 0) > 0
}

export async function deleteGuild(
  guildId: string,
  authHeaders: Record<string, string>,
): Promise<boolean> {
  await syncGuildInNextcloud(guildId, authHeaders, { delete: true })
  const res = await db.query(`DELETE FROM guilds WHERE id = $1`, [guildId])
  return (res.rowCount ?? 0) > 0
}
