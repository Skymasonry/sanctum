import { db } from "./db"

/**
 * Native Sanctum kanban — replaces the Deck-backed Quest board.
 * One board per guild (id => guild_id 1:1). Stacks are ordered columns
 * on the board; quests are ordered cards inside a stack.
 */

export interface QuestBoard {
  id: string
  guildId: string
  title: string
  stacks: QuestStack[]
}

export interface QuestStack {
  id: string
  title: string
  position: number
  quests: Quest[]
}

export interface Quest {
  id: string
  stackId: string
  title: string
  description: string
  position: number
  createdBy: string
  createdAt: string
  updatedAt: string
  dueAt: string | null
  completedAt: string | null
  labels: unknown[]
}

const DEFAULT_STACKS = [
  { title: "Called", position: 0 },
  { title: "Underway", position: 1 },
  { title: "Sealed", position: 2 },
]

/**
 * Return the board for a guild if provisioned, else null.
 */
export async function getBoardForGuild(guildId: string): Promise<QuestBoard | null> {
  const boardRes = await db.query<{ id: string; guild_id: string; title: string }>(
    `SELECT id, guild_id, title FROM quest_boards WHERE guild_id = $1`,
    [guildId],
  )
  if (boardRes.rowCount === 0) return null
  const board = boardRes.rows[0]

  const stacksRes = await db.query<{
    id: string; title: string; position: number
  }>(
    `SELECT id, title, "position" FROM quest_stacks WHERE board_id = $1 ORDER BY "position", created_at`,
    [board.id],
  )

  const stackIds = stacksRes.rows.map(s => s.id)
  const questsByStack = new Map<string, Quest[]>()
  if (stackIds.length > 0) {
    const questsRes = await db.query<{
      id: string; stack_id: string; title: string; description: string;
      position: number; created_by: string; created_at: Date; updated_at: Date;
      due_at: Date | null; completed_at: Date | null; labels: unknown
    }>(
      `SELECT id, stack_id, title, description, "position",
              created_by, created_at, updated_at, due_at, completed_at, labels
       FROM quests
       WHERE stack_id = ANY($1::uuid[])
       ORDER BY "position", created_at`,
      [stackIds],
    )
    for (const q of questsRes.rows) {
      const list = questsByStack.get(q.stack_id) ?? []
      list.push({
        id: q.id,
        stackId: q.stack_id,
        title: q.title,
        description: q.description,
        position: q.position,
        createdBy: q.created_by,
        createdAt: q.created_at.toISOString(),
        updatedAt: q.updated_at.toISOString(),
        dueAt: q.due_at?.toISOString() ?? null,
        completedAt: q.completed_at?.toISOString() ?? null,
        labels: Array.isArray(q.labels) ? q.labels as unknown[] : [],
      })
      questsByStack.set(q.stack_id, list)
    }
  }

  return {
    id: board.id,
    guildId: board.guild_id,
    title: board.title,
    stacks: stacksRes.rows.map(s => ({
      id: s.id,
      title: s.title,
      position: s.position,
      quests: questsByStack.get(s.id) ?? [],
    })),
  }
}

/**
 * Create the board (idempotent). Also seeds default stacks if the board
 * had none. Called from createSpaceForOrder(type=quests) at guild creation.
 */
export async function provisionBoard(guildId: string, title = "Quests"): Promise<QuestBoard> {
  await db.query("BEGIN")
  try {
    await db.query(
      `INSERT INTO quest_boards (guild_id, title) VALUES ($1, $2)
       ON CONFLICT (guild_id) DO NOTHING`,
      [guildId, title],
    )
    const board = await db.query<{ id: string }>(
      `SELECT id FROM quest_boards WHERE guild_id = $1`,
      [guildId],
    )
    const boardId = board.rows[0].id
    const stacks = await db.query<{ id: string }>(
      `SELECT id FROM quest_stacks WHERE board_id = $1`,
      [boardId],
    )
    if (stacks.rowCount === 0) {
      for (const s of DEFAULT_STACKS) {
        await db.query(
          `INSERT INTO quest_stacks (board_id, title, "position") VALUES ($1, $2, $3)`,
          [boardId, s.title, s.position],
        )
      }
    }
    await db.query("COMMIT")
  } catch (err) {
    await db.query("ROLLBACK")
    throw err
  }
  const result = await getBoardForGuild(guildId)
  if (!result) throw new Error("provisionBoard: board vanished after insert")
  return result
}

export async function createQuest(
  stackId: string,
  createdBy: string,
  input: { title: string; description?: string; dueAt?: string | null },
): Promise<Quest> {
  // Append at the bottom of the stack.
  const posRes = await db.query<{ next: number }>(
    `SELECT COALESCE(MAX("position"), -1) + 1 AS next FROM quests WHERE stack_id = $1`,
    [stackId],
  )
  const nextPos = posRes.rows[0].next
  const res = await db.query<{
    id: string; stack_id: string; title: string; description: string; position: number;
    created_by: string; created_at: Date; updated_at: Date; due_at: Date | null;
    completed_at: Date | null; labels: unknown
  }>(
    `INSERT INTO quests (stack_id, title, description, "position", created_by, due_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [stackId, input.title, input.description ?? "", nextPos, createdBy, input.dueAt ?? null],
  )
  const r = res.rows[0]
  return {
    id: r.id, stackId: r.stack_id, title: r.title, description: r.description, position: r.position,
    createdBy: r.created_by, createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString(),
    dueAt: r.due_at?.toISOString() ?? null, completedAt: r.completed_at?.toISOString() ?? null,
    labels: Array.isArray(r.labels) ? r.labels as unknown[] : [],
  }
}

export async function updateQuest(
  questId: string,
  patch: { title?: string; description?: string; dueAt?: string | null; completedAt?: string | null },
): Promise<boolean> {
  const sets: string[] = []
  const params: unknown[] = []
  let n = 1
  if (patch.title !== undefined) { sets.push(`title = $${n++}`); params.push(patch.title) }
  if (patch.description !== undefined) { sets.push(`description = $${n++}`); params.push(patch.description) }
  if (patch.dueAt !== undefined) { sets.push(`due_at = $${n++}`); params.push(patch.dueAt) }
  if (patch.completedAt !== undefined) { sets.push(`completed_at = $${n++}`); params.push(patch.completedAt) }
  if (sets.length === 0) return true
  sets.push(`updated_at = NOW()`)
  params.push(questId)
  const res = await db.query(
    `UPDATE quests SET ${sets.join(", ")} WHERE id = $${n}`,
    params,
  )
  return (res.rowCount ?? 0) > 0
}

/**
 * Move a quest to a new (stack, position). Reorders siblings accordingly.
 */
export async function moveQuest(
  questId: string,
  targetStackId: string,
  targetPosition: number,
): Promise<boolean> {
  await db.query("BEGIN")
  try {
    // Fetch the source position + stack
    const src = await db.query<{ stack_id: string; position: number }>(
      `SELECT stack_id, "position" FROM quests WHERE id = $1 FOR UPDATE`,
      [questId],
    )
    if (src.rowCount === 0) {
      await db.query("ROLLBACK")
      return false
    }
    const from = src.rows[0]

    // Close the gap in the source stack
    await db.query(
      `UPDATE quests SET "position" = "position" - 1
       WHERE stack_id = $1 AND "position" > $2`,
      [from.stack_id, from.position],
    )
    // Open a gap in the target stack
    await db.query(
      `UPDATE quests SET "position" = "position" + 1
       WHERE stack_id = $1 AND "position" >= $2 AND id <> $3`,
      [targetStackId, targetPosition, questId],
    )
    // Move
    await db.query(
      `UPDATE quests SET stack_id = $1, "position" = $2, updated_at = NOW() WHERE id = $3`,
      [targetStackId, targetPosition, questId],
    )
    await db.query("COMMIT")
    return true
  } catch (err) {
    await db.query("ROLLBACK")
    throw err
  }
}

export async function deleteQuest(questId: string): Promise<boolean> {
  const res = await db.query(`DELETE FROM quests WHERE id = $1`, [questId])
  return (res.rowCount ?? 0) > 0
}

export async function listComments(questId: string): Promise<Array<{
  id: string; authorId: string; body: string; createdAt: string
}>> {
  const res = await db.query<{ id: string; author_id: string; body: string; created_at: Date }>(
    `SELECT id, author_id, body, created_at FROM quest_comments
     WHERE quest_id = $1 ORDER BY created_at`,
    [questId],
  )
  return res.rows.map(c => ({
    id: c.id, authorId: c.author_id, body: c.body, createdAt: c.created_at.toISOString(),
  }))
}

export async function addComment(
  questId: string,
  authorId: string,
  body: string,
): Promise<{ id: string; authorId: string; body: string; createdAt: string }> {
  const res = await db.query<{ id: string; created_at: Date }>(
    `INSERT INTO quest_comments (quest_id, author_id, body) VALUES ($1, $2, $3) RETURNING id, created_at`,
    [questId, authorId, body],
  )
  return { id: res.rows[0].id, authorId, body, createdAt: res.rows[0].created_at.toISOString() }
}
