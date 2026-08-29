import { notFound } from "next/navigation"
import { FileText } from "lucide-react"

import { ChamberHeader, ChamberScroll } from "@/components/shared"
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
    <ChamberScroll>
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
    </ChamberScroll>
  )
}
