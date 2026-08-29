import { db } from "./db"

export const FROM_SKY_TO_STONE_SLUG = "from-sky-to-stone-2026"

/**
 * Q&A payload for the From Sky To Stone application. Deliberately
 * loose (JSONB, no per-field DB columns) since this is a yearly event
 * form and the questions will drift — see FromSkyToStoneForm.tsx for
 * where each field is actually collected.
 */
export interface FromSkyToStoneAnswers {
  mobile: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postcode: string
  birthDate: string // ISO yyyy-mm-dd
  contribution: "yes" | "no" | "assistance" | ""
  dietary: string
  arrivingThuToSun: "yes" | "no" | ""
  wantsOnlineIfCantAttend: "yes" | "no" | "n/a"
  campingGearNeeds: string
  isReturnee: "yes" | "no" | ""
  returneeArrivingWed: "yes" | "no" | "n/a"
  healthNotes: string
  focus: string
  rolesAndContributions: string
}

export interface EventApplication {
  eventSlug: string
  userId: string
  answers: FromSkyToStoneAnswers
  agreed: boolean
  submittedAt: string
  updatedAt: string
}

interface EventApplicationRow {
  event_slug: string
  user_id: string
  answers: unknown
  agreed: boolean
  submitted_at: Date
  updated_at: Date
}

function rowToApplication(r: EventApplicationRow): EventApplication {
  return {
    eventSlug: r.event_slug,
    userId: r.user_id,
    answers: (typeof r.answers === "object" && r.answers !== null ? r.answers : {}) as FromSkyToStoneAnswers,
    agreed: r.agreed,
    submittedAt: r.submitted_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  }
}

export async function getApplication(eventSlug: string, userId: string): Promise<EventApplication | null> {
  const res = await db.query<EventApplicationRow>(
    `SELECT * FROM event_applications WHERE event_slug = $1 AND user_id = $2`,
    [eventSlug, userId],
  )
  return (res.rowCount ?? 0) > 0 ? rowToApplication(res.rows[0]) : null
}

/**
 * Create or update this user's application for an event. Re-submitting
 * (new member edits, or a returning member updating their info) just
 * overwrites — there's one canonical row per (event, user).
 */
export async function upsertApplication(
  eventSlug: string,
  userId: string,
  answers: FromSkyToStoneAnswers,
  agreed: boolean,
): Promise<EventApplication> {
  const res = await db.query<EventApplicationRow>(
    `INSERT INTO event_applications (event_slug, user_id, answers, agreed)
     VALUES ($1, $2, $3::jsonb, $4)
     ON CONFLICT (event_slug, user_id) DO UPDATE SET
       answers = EXCLUDED.answers,
       agreed = EXCLUDED.agreed,
       updated_at = NOW()
     RETURNING *`,
    [eventSlug, userId, JSON.stringify(answers), agreed],
  )
  return rowToApplication(res.rows[0])
}

/**
 * All applications for an event, newest first. For the leadership
 * review list — callers must gate this behind isGrandmaster/isElder.
 */
export async function getApplicationsForEvent(eventSlug: string): Promise<EventApplication[]> {
  const res = await db.query<EventApplicationRow>(
    `SELECT * FROM event_applications WHERE event_slug = $1 ORDER BY submitted_at DESC`,
    [eventSlug],
  )
  return res.rows.map(rowToApplication)
}
