import { getEvents, CalendarEvent } from "./calendar"
import { getMessages, TalkMessage } from "./talk"
import { getStacks, DeckStack } from "./deck"
import type { Guild } from "@/types/guild"

export type FocusType = "pulse" | "rite" | "quest" | "scroll"

export interface FocusData {
  type: FocusType
  title: string
  description: string
  meta: string
  avatars: string[]
  // Type-specific data
  rite?: CalendarEvent
  quest?: { name: string; progress: number; total: number }
  recentMessage?: TalkMessage
}

export async function determineFocus(guild: Guild): Promise<FocusData> {
  const results = await Promise.allSettled([
    // Check for recent pulse activity
    guild.resources.talkRoom 
      ? getMessages(guild.resources.talkRoom, 5) 
      : Promise.resolve([]),
    // Check for upcoming rites
    guild.resources.calendarUri 
      ? getEvents(guild.resources.calendarUri) 
      : Promise.resolve([]),
    // Check for active quests
    guild.resources.deckBoardId 
      ? getStacks(guild.resources.deckBoardId) 
      : Promise.resolve([]),
  ])

  const messages = results[0].status === "fulfilled" ? results[0].value : []
  const events = results[1].status === "fulfilled" ? results[1].value : []
  const stacks = results[2].status === "fulfilled" ? results[2].value : []

  const now = new Date()
  const in72Hours = new Date(now.getTime() + 72 * 60 * 60 * 1000)

  // Priority 1: Check for very recent pulse activity (last 30 min)
  const recentMessages = messages.filter((m: TalkMessage) => {
    const msgTime = new Date(m.timestamp * 1000)
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000)
    return msgTime > thirtyMinAgo && m.messageType === "comment" && m.actorType === "users"
  })

  if (recentMessages.length >= 2) {
    const uniqueActors = [...new Set(recentMessages.map((m: TalkMessage) => m.actorId))]
    return {
      type: "pulse",
      title: "The Chat",
      description: recentMessages[0]?.message?.substring(0, 80) || "The circle stirs with whispers...",
      meta: `${uniqueActors.length} brothers in conversation`,
      avatars: uniqueActors.slice(0, 4).map(u => `/api/avatar/${u}/32`),
      recentMessage: recentMessages[0],
    }
  }

  // Priority 2: Check for upcoming rite within 72 hours
  const upcomingRite = events.find((e: CalendarEvent) => {
    const eventDate = new Date(e.start)
    return eventDate > now && eventDate < in72Hours
  })

  if (upcomingRite) {
    const eventDate = new Date(upcomingRite.start)
    const timeUntil = formatTimeUntil(eventDate)
    return {
      type: "rite",
      title: upcomingRite.title,
      description: `The circle gathers ${timeUntil}`,
      meta: formatRiteDate(eventDate),
      avatars: guild.members.slice(0, 4).map(u => `/api/avatar/${u}/32`),
      rite: upcomingRite,
    }
  }

  // Priority 3: Check for active quests with pending tasks
  const activeQuest = findActiveQuest(stacks)
  if (activeQuest) {
    return {
      type: "quest",
      title: activeQuest.name,
      description: `${activeQuest.remaining} tasks await completion`,
      meta: `${activeQuest.progress} of ${activeQuest.total} complete`,
      avatars: activeQuest.assignees.slice(0, 4).map(u => `/api/avatar/${u}/32`),
      quest: { name: activeQuest.name, progress: activeQuest.progress, total: activeQuest.total },
    }
  }

  // Priority 4: Pending scroll (not implemented yet - would need Forms API)
  // Skip for now

  // Priority 5: Default - ambient pulse
  const lastMessage = messages.find((m: TalkMessage) => 
    m.messageType === "comment" && m.actorType === "users"
  )
  
  return {
    type: "pulse",
    title: "The Chat",
    description: lastMessage?.message?.substring(0, 80) || "The circle awaits your presence...",
    meta: `${guild.memberCount} brothers in the cove`,
    avatars: guild.members.slice(0, 4).map(u => `/api/avatar/${u}/32`),
    recentMessage: lastMessage,
  }
}

function formatTimeUntil(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  
  if (hours < 1) return "within the hour"
  if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`
  const days = Math.floor(hours / 24)
  return `in ${days} day${days === 1 ? "" : "s"}`
}

function formatRiteDate(date: Date): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === now.toDateString()) {
    return "Today at " + date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow at " + date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
  }
  return date.toLocaleDateString("en-AU", { 
    weekday: "short", 
    month: "short", 
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  })
}

interface ActiveQuestInfo {
  name: string
  progress: number
  total: number
  remaining: number
  assignees: string[]
}

function findActiveQuest(stacks: DeckStack[]): ActiveQuestInfo | null {
  // Find "In Progress" or similar stack with cards
  const inProgressStack = stacks.find(s => 
    s.title.toLowerCase().includes("progress") || 
    s.title.toLowerCase().includes("doing") ||
    s.title.toLowerCase().includes("active")
  )
  
  if (!inProgressStack || inProgressStack.cards.length === 0) {
    return null
  }

  // Get the first active card as the "quest"
  const card = inProgressStack.cards[0]
  
  // Count total cards across all stacks
  const totalCards = stacks.reduce((sum, s) => sum + s.cards.length, 0)
  const doneStack = stacks.find(s => 
    s.title.toLowerCase().includes("done") || 
    s.title.toLowerCase().includes("complete")
  )
  const doneCount = doneStack?.cards.length || 0

  return {
    name: card.title,
    progress: doneCount,
    total: totalCards,
    remaining: totalCards - doneCount,
    assignees: card.assignedUsers,
  }
}
