import { db } from "./db"

/**
 * Cross-guild counts for the dashboard chamber tiles. Each returns a
 * Map<guildId, count> so the caller can enrich the stirring rows.
 *
 * Both queries are batched by ANY($1::text[]) so we only make two
 * round-trips regardless of how many guilds the user is in.
 */

/**
 * Open (not yet completed) quests with a due date in the past or
 * within the next week. Guilds without a due-dated open quest simply
 * don't appear in the returned map.
 */
export async function openQuestCountsByGuild(
  guildIds: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (guildIds.length === 0) return out

  const res = await db.query<{ guild_id: string; n: string }>(
    `SELECT b.guild_id, COUNT(*)::text AS n
       FROM quests q
       JOIN quest_stacks s ON s.id = q.stack_id
       JOIN quest_boards b ON b.id = s.board_id
      WHERE b.guild_id = ANY($1::text[])
        AND q.completed_at IS NULL
        AND q.due_at IS NOT NULL
        AND q.due_at < NOW() + interval '7 days'
      GROUP BY b.guild_id`,
    [guildIds],
  )
  for (const r of res.rows) out.set(r.guild_id, Number(r.n))
  return out
}

/**
 * Published scrolls the given user hasn't submitted yet. Draft scrolls
 * are excluded — they aren't asking for input yet.
 */
export async function pendingScrollCountsByGuild(
  guildIds: string[],
  userId: string,
): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (guildIds.length === 0) return out

  const res = await db.query<{ guild_id: string; n: string }>(
    `SELECT s.guild_id, COUNT(*)::text AS n
       FROM scrolls s
      WHERE s.guild_id = ANY($1::text[])
        AND s.published = true
        AND NOT EXISTS (
          SELECT 1 FROM scroll_submissions sub
          WHERE sub.scroll_id = s.id
            AND lower(sub.submitted_by) = lower($2)
        )
      GROUP BY s.guild_id`,
    [guildIds, userId],
  )
  for (const r of res.rows) out.set(r.guild_id, Number(r.n))
  return out
}
