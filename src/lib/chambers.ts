import {
  Archive,
  Calendar,
  FileText,
  MessageCircle,
  Target,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react"

import type { ChamberId } from "@/types/guild"

export interface ChamberDef {
  id: ChamberId
  icon: LucideIcon
  name: string
  note: string
}

/**
 * Canonical list of chambers a guild can enable. Consumed by the
 * seeder form, the settings editor, and any per-chamber display code
 * that needs a name / icon.
 */
export const CHAMBER_DEFS: ChamberDef[] = [
  { id: "pulse", icon: MessageCircle, name: "Chat", note: "Whispers between members" },
  { id: "chamber", icon: Video, name: "Chamber", note: "Live meeting hall" },
  { id: "rites", icon: Calendar, name: "Rites", note: "Shared calendar" },
  { id: "quests", icon: Target, name: "Quests", note: "Kanban of tasks" },
  { id: "scrolls", icon: FileText, name: "Scrolls", note: "Surveys & forms" },
  { id: "archive", icon: Archive, name: "Archive", note: "Files + live docs" },
  { id: "brotherhood", icon: Users, name: "Brothers", note: "Member roster" },
]

export const ALL_CHAMBER_IDS: ChamberId[] = CHAMBER_DEFS.map(c => c.id)
