export interface GuildApplication {
  userId: string
  message?: string
  agreements: Array<{ id: number; text: string; agreed?: boolean }>
  appliedAt: string
}

export interface Guild {
  id: string
  name: string
  description: string
  icon: string
  color: string
  admission: "open" | "closed" | "mandatory"
  seederUid: string
  members: string[]
  pending: string[]
  applications?: GuildApplication[]
  memberCount: number
  category?: string
  patternIntegrity?: string
  evolutionaryPurpose?: string
  createdAt: string
  circleId: string
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
