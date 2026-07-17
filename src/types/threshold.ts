export interface ThresholdMember {
  name: string
  avatar: string | null
  lastSeen: string | null
}

export interface LivePresence {
  initials: string
  avatar: string | null
}

export interface LiveRoom {
  room: string
  guildId: string
  startedAt: string
  present: LivePresence[]
}

export interface StirringGuild {
  guildId: string
  name: string
  glyph: string
  lastActivity: string | null
  unreadMessages: number
  newFiles: number
  eventChanges: number
  presentNow: number
  /** Open quests due within a week (or already overdue), not yet completed. */
  openQuests: number
  /** Published scrolls the current user hasn't submitted yet. */
  pendingScrolls: number
}

export type RsvpState = "going" | "declined" | null
export type AccessModel = "join" | "apply" | "invite"

export interface Gathering {
  id: string
  title: string
  startsAt: string
  location: string | null
  guild: string
  attending: number
  capacity: number | null
  rsvp: RsvpState
  accessModel: AccessModel
}

export interface ThresholdData {
  member: ThresholdMember
  live: LiveRoom[]
  stirring: StirringGuild[]
  gatherings: Gathering[]
}
