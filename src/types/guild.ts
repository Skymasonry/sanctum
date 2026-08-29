export interface GuildApplication {
  userId: string
  message?: string
  agreements: Array<{ id: number; text: string; agreed?: boolean }>
  appliedAt: string
}

export type ChamberId =
  | "pulse"
  | "chamber"
  | "rites"
  | "quests"
  | "scrolls"
  | "archive"
  | "brotherhood"

export interface Guild {
  id: string
  name: string
  description: string
  icon: string
  color: string
  admission: "open" | "closed" | "mandatory"
  /** The founding seeder — one per guild, set at creation, historical. */
  seederUid: string
  /** Ongoing pattern-integrity holders — zero or more, editable by current stewards or the seeder. */
  stewardUids: string[]
  /** Optional, situational — named by the seeder/stewards, not self-governing. Zero by default. */
  leadershipCircle: string[]
  members: string[]
  pending: string[]
  applications?: GuildApplication[]
  memberCount: number
  category?: string
  patternIntegrity?: string
  evolutionaryPurpose?: string
  createdAt: string
  circleId: string
  /** Enabled chambers on the guild home grid. Seeder-controlled. */
  chambers: ChamberId[]
  applicationForm?: {
    agreements: Array<{ id: number; text: string }>
  }
  resources: {
    talkRoom?: string | null
    calendarUri?: string
    folderId?: number
    folderName?: string
    deckBoardId?: number
  }
}

export interface GuildContextValue {
  guild: Guild | null
  isLoading: boolean
}

/**
 * Whether a user can manage this guild — the founding seeder or any
 * current steward. Used everywhere a "seeder only" action lives
 * (settings, chambers, scroll editing, application review).
 */
export function isGuildManager(guild: Guild, username: string | undefined | null): boolean {
  if (!username) return false
  const u = username.toLowerCase()
  if (guild.seederUid.toLowerCase() === u) return true
  return guild.stewardUids.some(s => s.toLowerCase() === u)
}

/**
 * Whether a user can review this guild's scroll submissions — a
 * manager (seeder/steward), or a member of the Leadership Circle.
 * Broader than isGuildManager on purpose: Leadership Circle members
 * can't edit the guild, but reviewing who applied to their own
 * initiative is exactly what the role is for.
 */
export function canReviewSubmissions(guild: Guild, username: string | undefined | null): boolean {
  if (!username) return false
  if (isGuildManager(guild, username)) return true
  const u = username.toLowerCase()
  return guild.leadershipCircle.some(s => s.toLowerCase() === u)
}
