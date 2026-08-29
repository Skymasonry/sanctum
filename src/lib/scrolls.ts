import { db } from "./db"

export type QuestionType = "short" | "long" | "radio" | "checkbox" | "select" | "date"

export interface ScrollQuestion {
  id: string
  scrollId: string
  text: string
  type: QuestionType
  required: boolean
  position: number
  options: string[]
}

export type ContentBlockType = "heading" | "body"

export interface ContentBlock {
  id: string
  type: ContentBlockType
  text: string
}

export interface Scroll {
  id: string
  guildId: string
  title: string
  description: string
  createdBy: string
  createdAt: string
  updatedAt: string
  published: boolean
  headerImageUrl: string | null
  autoJoinGuild: boolean
  publicAccess: boolean
  contentBlocks: ContentBlock[]
  questions: ScrollQuestion[]
}

export interface ScrollSubmission {
  id: string
  scrollId: string
  submittedBy: string | null
  submittedEmail: string | null
  submittedAt: string
  answers: Record<string, unknown>
}

interface ScrollMetaRow {
  id: string
  guild_id: string
  title: string
  description: string
  created_by: string
  created_at: Date
  updated_at: Date
  published: boolean
  header_image_url: string | null
  auto_join_guild: boolean
  public_access: boolean
  content_blocks: unknown
}

const SCROLL_COLUMNS = `id, guild_id, title, description, created_by, created_at, updated_at,
       published, header_image_url, auto_join_guild, public_access, content_blocks`

function rowToScrollMeta(m: ScrollMetaRow) {
  return {
    id: m.id,
    guildId: m.guild_id,
    title: m.title,
    description: m.description,
    createdBy: m.created_by,
    createdAt: m.created_at.toISOString(),
    updatedAt: m.updated_at.toISOString(),
    published: m.published,
    contentBlocks: Array.isArray(m.content_blocks) ? (m.content_blocks as ContentBlock[]) : [],
    headerImageUrl: m.header_image_url,
    autoJoinGuild: m.auto_join_guild,
    publicAccess: m.public_access,
  }
}

/**
 * List all scrolls for a guild — returns light rows without questions
 * for the index view.
 */
export async function listScrollsForGuild(guildId: string): Promise<Array<
  Omit<Scroll, "questions"> & { questionCount: number; submissionCount: number }
>> {
  const res = await db.query<ScrollMetaRow & { question_count: number; submission_count: number }>(
    `SELECT s.*,
            (SELECT COUNT(*) FROM scroll_questions q WHERE q.scroll_id = s.id) AS question_count,
            (SELECT COUNT(*) FROM scroll_submissions sub WHERE sub.scroll_id = s.id) AS submission_count
     FROM scrolls s WHERE s.guild_id = $1 ORDER BY s.updated_at DESC`,
    [guildId],
  )
  return res.rows.map(r => ({
    ...rowToScrollMeta(r),
    questionCount: Number(r.question_count),
    submissionCount: Number(r.submission_count),
  }))
}

export async function getScroll(scrollId: string): Promise<Scroll | null> {
  const [meta, questions] = await Promise.all([
    db.query<ScrollMetaRow>(`SELECT ${SCROLL_COLUMNS} FROM scrolls WHERE id = $1`, [scrollId]),
    db.query<{
      id: string; scroll_id: string; text: string; type: QuestionType;
      required: boolean; position: number; options: unknown
    }>(
      `SELECT id, scroll_id, text, type, required, "position", options
       FROM scroll_questions WHERE scroll_id = $1 ORDER BY "position"`,
      [scrollId],
    ),
  ])
  if (meta.rowCount === 0) return null
  return {
    ...rowToScrollMeta(meta.rows[0]),
    questions: questions.rows.map(q => ({
      id: q.id,
      scrollId: q.scroll_id,
      text: q.text,
      type: q.type,
      required: q.required,
      position: q.position,
      options: Array.isArray(q.options) ? q.options as string[] : [],
    })),
  }
}

export async function createScroll(
  guildId: string,
  createdBy: string,
  input: { title: string; description?: string },
): Promise<Scroll> {
  const res = await db.query<{ id: string }>(
    `INSERT INTO scrolls (guild_id, title, description, created_by)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [guildId, input.title, input.description ?? "", createdBy],
  )
  const scroll = await getScroll(res.rows[0].id)
  if (!scroll) throw new Error("createScroll: scroll vanished")
  return scroll
}

export async function updateScroll(
  scrollId: string,
  patch: {
    title?: string
    description?: string
    published?: boolean
    headerImageUrl?: string | null
    autoJoinGuild?: boolean
    publicAccess?: boolean
    contentBlocks?: ContentBlock[]
  },
): Promise<boolean> {
  const sets: string[] = []
  const params: unknown[] = []
  let n = 1
  if (patch.title !== undefined) { sets.push(`title = $${n++}`); params.push(patch.title) }
  if (patch.description !== undefined) { sets.push(`description = $${n++}`); params.push(patch.description) }
  if (patch.published !== undefined) { sets.push(`published = $${n++}`); params.push(patch.published) }
  if (patch.headerImageUrl !== undefined) { sets.push(`header_image_url = $${n++}`); params.push(patch.headerImageUrl) }
  if (patch.autoJoinGuild !== undefined) { sets.push(`auto_join_guild = $${n++}`); params.push(patch.autoJoinGuild) }
  if (patch.publicAccess !== undefined) { sets.push(`public_access = $${n++}`); params.push(patch.publicAccess) }
  if (patch.contentBlocks !== undefined) { sets.push(`content_blocks = $${n++}::jsonb`); params.push(JSON.stringify(patch.contentBlocks)) }
  if (sets.length === 0) return true
  sets.push(`updated_at = NOW()`)
  params.push(scrollId)
  const res = await db.query(
    `UPDATE scrolls SET ${sets.join(", ")} WHERE id = $${n}`,
    params,
  )
  return (res.rowCount ?? 0) > 0
}

export async function deleteScroll(scrollId: string): Promise<boolean> {
  const res = await db.query(`DELETE FROM scrolls WHERE id = $1`, [scrollId])
  return (res.rowCount ?? 0) > 0
}

export async function addQuestion(
  scrollId: string,
  input: { text: string; type?: QuestionType; required?: boolean; options?: string[] },
): Promise<ScrollQuestion> {
  const posRes = await db.query<{ next: number }>(
    `SELECT COALESCE(MAX("position"), -1) + 1 AS next FROM scroll_questions WHERE scroll_id = $1`,
    [scrollId],
  )
  const nextPos = posRes.rows[0].next
  const res = await db.query<{
    id: string; scroll_id: string; text: string; type: QuestionType;
    required: boolean; position: number; options: unknown
  }>(
    `INSERT INTO scroll_questions (scroll_id, text, type, required, "position", options)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING *`,
    [scrollId, input.text, input.type ?? "short", input.required ?? false, nextPos, JSON.stringify(input.options ?? [])],
  )
  const r = res.rows[0]
  return {
    id: r.id, scrollId: r.scroll_id, text: r.text, type: r.type,
    required: r.required, position: r.position,
    options: Array.isArray(r.options) ? r.options as string[] : [],
  }
}

export async function updateQuestion(
  questionId: string,
  patch: { text?: string; type?: QuestionType; required?: boolean; options?: string[] },
): Promise<boolean> {
  const sets: string[] = []
  const params: unknown[] = []
  let n = 1
  if (patch.text !== undefined) { sets.push(`text = $${n++}`); params.push(patch.text) }
  if (patch.type !== undefined) { sets.push(`type = $${n++}`); params.push(patch.type) }
  if (patch.required !== undefined) { sets.push(`required = $${n++}`); params.push(patch.required) }
  if (patch.options !== undefined) { sets.push(`options = $${n++}::jsonb`); params.push(JSON.stringify(patch.options)) }
  if (sets.length === 0) return true
  params.push(questionId)
  const res = await db.query(
    `UPDATE scroll_questions SET ${sets.join(", ")} WHERE id = $${n}`,
    params,
  )
  return (res.rowCount ?? 0) > 0
}

export async function deleteQuestion(questionId: string): Promise<boolean> {
  const res = await db.query(`DELETE FROM scroll_questions WHERE id = $1`, [questionId])
  return (res.rowCount ?? 0) > 0
}

/**
 * Record a submission. `submittedBy` is an Authentik username for
 * normal in-app fills; it's null for a public (unauthenticated)
 * submission, which is identified by `submittedEmail` instead.
 */
export async function submitScroll(
  scrollId: string,
  submittedBy: string | null,
  submittedEmail: string | null,
  answers: Record<string, unknown>,
): Promise<ScrollSubmission> {
  const res = await db.query<{ id: string; submitted_at: Date }>(
    `INSERT INTO scroll_submissions (scroll_id, submitted_by, submitted_email, answers)
     VALUES ($1, $2, $3, $4::jsonb) RETURNING id, submitted_at`,
    [scrollId, submittedBy, submittedEmail, JSON.stringify(answers)],
  )
  return {
    id: res.rows[0].id,
    scrollId,
    submittedBy,
    submittedEmail,
    submittedAt: res.rows[0].submitted_at.toISOString(),
    answers,
  }
}

export async function listSubmissions(scrollId: string): Promise<ScrollSubmission[]> {
  const res = await db.query<{
    id: string; scroll_id: string; submitted_by: string | null; submitted_email: string | null
    submitted_at: Date; answers: unknown
  }>(
    `SELECT id, scroll_id, submitted_by, submitted_email, submitted_at, answers
     FROM scroll_submissions WHERE scroll_id = $1 ORDER BY submitted_at DESC`,
    [scrollId],
  )
  return res.rows.map(r => ({
    id: r.id,
    scrollId: r.scroll_id,
    submittedBy: r.submitted_by,
    submittedEmail: r.submitted_email,
    submittedAt: r.submitted_at.toISOString(),
    answers: (typeof r.answers === "object" && r.answers !== null ? r.answers : {}) as Record<string, unknown>,
  }))
}
