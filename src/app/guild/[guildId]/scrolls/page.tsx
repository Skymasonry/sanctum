import { notFound } from "next/navigation"
import { FileText } from "lucide-react"

import { ChamberHeader } from "@/components/shared"
import { ScrollsView } from "@/components/scrolls/ScrollsView"
import { getGuild } from "@/lib/guilds"
import { listScrollsForGuild } from "@/lib/scrolls"

interface ScrollsPageProps {
  params: Promise<{ guildId: string }>
}

export default async function ScrollsPage({ params }: ScrollsPageProps) {
  const { guildId } = await params
  const guild = await getGuild(guildId)
  if (!guild) notFound()

  const scrolls = await listScrollsForGuild(guildId)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="scrollbar-none h-full min-h-0 flex-1 overflow-y-auto p-6 lg:p-8">
        <ChamberHeader
          backHref={`/guild/${guildId}`}
          icon={<FileText className="h-10 w-10 text-guild" />}
          title="Scrolls"
          subtitle={`Records + surveys of ${guild.name}`}
        />
        <ScrollsView
          guildId={guildId}
          initialScrolls={scrolls}
        />
      </div>
    </div>
  )
}
