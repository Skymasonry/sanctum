/**
 * Pending auto-joins for the FSTS application flow.
 *
 * When a new member submits the public form they don't have an account yet.
 * We store their email + target guilds here; the root layout applies them
 * the first time they log in.
 */
import { db } from "./db"
import { addMember } from "./guild-writes"

/** Guild IDs to auto-join on FSTS form submission. */
export const FSTS_AUTO_JOIN_GUILDS = ["from-sky-to-stone"] as const

/**
 * Look up a guild's ID by its display name. Used to add users to The
 * Brotherhood (whose slug we don't hardcode — it comes from orders.json).
 */
export async function getGuildIdByName(name: string): Promise<string | null> {
  const res = await db.query<{ id: string }>(
    `SELECT id FROM guilds WHERE lower(name) = lower($1) LIMIT 1`,
    [name],
  )
  return res.rows[0]?.id ?? null
}

/**
 * Return all guild IDs a new FSTS applicant should be added to.
 * Includes the FSTS guild and The Brotherhood (if it exists in the DB).
 * Extend this list when Circle in the Sky is created.
 */
export async function getFSTSJoinGuildIds(): Promise<string[]> {
  const brotherhoodId = await getGuildIdByName("The Brotherhood")
  return [
    ...FSTS_AUTO_JOIN_GUILDS,
    ...(brotherhoodId ? [brotherhoodId] : []),
  ]
}

/**
 * Store pending guild memberships for a new applicant's email.
 * Idempotent: uses INSERT ... ON CONFLICT DO NOTHING per (email, guild_id).
 */
export async function storePendingJoins(
  email: string,
  guildIds: string[],
): Promise<void> {
  if (!guildIds.length) return
  await Promise.all(
    guildIds.map(guildId =>
      db.query(
        `INSERT INTO pending_auto_joins (email, guild_id)
         VALUES (lower($1), $2)
         ON CONFLICT DO NOTHING`,
        [email, guildId],
      ),
    ),
  )
}

/**
 * Apply any unapplied pending joins for this user's email and mark them done.
 * Called from the root layout on every authenticated request — the indexed
 * WHERE applied_at IS NULL makes the common case (nothing pending) ~1 ms.
 */
export async function applyPendingJoins(
  username: string,
  email: string,
  authHeaders: Record<string, string>,
): Promise<void> {
  const pending = await db.query<{ id: number; guild_id: string }>(
    `SELECT id, guild_id FROM pending_auto_joins
     WHERE lower(email) = lower($1) AND applied_at IS NULL`,
    [email],
  )
  if (pending.rowCount === 0) return

  await Promise.all(
    pending.rows.map(row =>
      addMember(row.guild_id, username, authHeaders).catch(err =>
        console.error(`pending-join: addMember(${row.guild_id}, ${username}) failed:`, err),
      ),
    ),
  )

  const ids = pending.rows.map(r => r.id)
  await db.query(
    `UPDATE pending_auto_joins SET applied_at = NOW() WHERE id = ANY($1::bigint[])`,
    [ids],
  )
}
