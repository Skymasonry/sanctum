"use client"

import { motion } from "framer-motion"
import { MessageCircle, Calendar, Target, FileText, Archive, Users, Video } from "lucide-react"
import { EntryTile } from "./EntryTile"
import { staggerContainer, staggerItem } from "@/components/shell"
import type { Guild } from "@/types/guild"
import type { ChamberNotifications } from "@/lib/notifications"

interface EntryGridProps {
  guildId: string
  guild?: Guild
  notifications?: ChamberNotifications
}

export function EntryGrid({ guildId, guild, notifications }: EntryGridProps) {
  // Build chambers based on available resources
  const chambers: Array<{
    id: string
    icon: typeof MessageCircle
    title: string
    description: string
    badge?: number
    external?: boolean
    href?: string
  }> = []

  // Every native chamber is always shown. Chambers still backed by
  // Nextcloud (Pulse, Rites) fall through to an "Open it" screen when
  // the resource hasn't been provisioned yet.
  chambers.push({
    id: "pulse",
    icon: MessageCircle,
    title: "The Chat",
    description: "Whispers in the cove",
    badge: notifications?.pulse,
  })

  chambers.push({
    id: "chamber",
    icon: Video,
    title: "The Chamber",
    description: "Enter the meeting hall",
    external: true,
    href: `https://meet.talitamoss.info/${guildId}`,
  })

  chambers.push({
    id: "rites",
    icon: Calendar,
    title: "Rites",
    description: "Upcoming gatherings",
    badge: notifications?.rites,
  })

  chambers.push({
    id: "quests",
    icon: Target,
    title: "Quests",
    description: "Active endeavors",
    badge: notifications?.quests,
  })

  chambers.push({
    id: "scrolls",
    icon: FileText,
    title: "Scrolls",
    description: "Inquiries & forms",
  })

  chambers.push({
    id: "archive",
    icon: Archive,
    title: "Archive",
    description: "Shared knowledge",
  })

  chambers.push({
    id: "brotherhood",
    icon: Users,
    title: "Brothers",
    description: `${guild?.memberCount || 0} members`,
  })

  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {chambers.map((chamber) => (
        <motion.div key={chamber.id} variants={staggerItem}>
          <EntryTile
            href={chamber.href || `/guild/${guildId}/${chamber.id}`}
            icon={chamber.icon}
            title={chamber.title}
            description={chamber.description}
            badge={chamber.badge}
            external={chamber.external}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}
