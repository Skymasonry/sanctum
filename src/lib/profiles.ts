import { db } from "./db"

/**
 * Native member profile.
 *
 * Storage in Postgres `profiles`. Rows are created lazily on first
 * access from Nextcloud's user record — so a member who's never opened
 * their profile still resolves through getProfile() with sane defaults.
 * Once a native user directory exists, that Nextcloud fallback goes
 * away.
 */

export interface Profile {
  userId: string
  displayName: string
  email: string
  bio: string
  contact: Record<string, unknown>
  visible: boolean
  joinedAt: string
  updatedAt: string
}

interface ProfileRow {
  user_id: string
  display_name: string
  email: string
  bio: string
  contact: unknown
  visible: boolean
  joined_at: Date
  updated_at: Date
}

function rowToProfile(r: ProfileRow): Profile {
  return {
    userId: r.user_id,
    displayName: r.display_name,
    email: r.email,
    bio: r.bio,
    contact: (typeof r.contact === "object" && r.contact !== null ? r.contact : {}) as Record<string, unknown>,
    visible: r.visible,
    joinedAt: r.joined_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  }
}

/**
 * Return the profile for a user. Auto-creates a shell row (display
 * name = user id) if none exists so callers always get *something*.
 * The name can be refined by the user editing their own profile, or
 * inferred later when we own the identity layer.
 */
export async function getProfile(userId: string, hintedDisplayName?: string): Promise<Profile | null> {
  if (!userId) return null

  const existing = await db.query<ProfileRow>(
    `SELECT * FROM profiles WHERE user_id = $1`,
    [userId],
  )
  if ((existing.rowCount ?? 0) > 0) return rowToProfile(existing.rows[0])

  const inserted = await db.query<ProfileRow>(
    `INSERT INTO profiles (user_id, display_name)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING *`,
    [userId, hintedDisplayName ?? userId],
  )
  return rowToProfile(inserted.rows[0])
}

/**
 * Update a profile. Only the profile owner (checked by caller) can call
 * this. `contact` is a shallow merge into the existing JSONB.
 */
export async function updateProfile(
  userId: string,
  patch: {
    displayName?: string
    bio?: string
    contact?: Record<string, unknown>
    visible?: boolean
  },
): Promise<Profile | null> {
  const sets: string[] = []
  const params: unknown[] = []
  let n = 1

  if (patch.displayName !== undefined) { sets.push(`display_name = $${n++}`); params.push(patch.displayName) }
  if (patch.bio !== undefined) { sets.push(`bio = $${n++}`); params.push(patch.bio) }
  if (patch.visible !== undefined) { sets.push(`visible = $${n++}`); params.push(patch.visible) }
  if (patch.contact !== undefined) {
    sets.push(`contact = contact || $${n++}::jsonb`)
    params.push(JSON.stringify(patch.contact))
  }

  if (sets.length === 0) return getProfile(userId)

  sets.push(`updated_at = NOW()`)
  params.push(userId)
  const res = await db.query<ProfileRow>(
    `UPDATE profiles SET ${sets.join(", ")} WHERE user_id = $${n} RETURNING *`,
    params,
  )
  if (res.rowCount === 0) return null
  return rowToProfile(res.rows[0])
}

/**
 * List profiles for a set of user ids in one shot — for member roster
 * views. Missing profiles return a shell entry so the UI always has
 * something to render.
 */
export async function getProfilesByIds(userIds: string[]): Promise<Map<string, Profile>> {
  const out = new Map<string, Profile>()
  if (userIds.length === 0) return out

  const res = await db.query<ProfileRow>(
    `SELECT * FROM profiles WHERE user_id = ANY($1::text[])`,
    [userIds],
  )
  for (const r of res.rows) out.set(r.user_id, rowToProfile(r))

  // Any missing ids get a lazy-populated stub.
  const missing = userIds.filter(u => !out.has(u))
  await Promise.all(
    missing.map(async u => {
      const p = await getProfile(u)
      if (p) out.set(u, p)
    }),
  )
  return out
}

