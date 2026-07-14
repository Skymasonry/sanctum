import { notFound } from "next/navigation"
import { FileText } from "lucide-react"

import { ChamberHeader } from "@/components/shared"
import { ScrollDetail } from "@/components/scrolls/ScrollDetail"
import { getUser } from "@/lib/auth"
import { getGuild } from "@/lib/guilds"
import { getScroll, listSubmissions } from "@/lib/scrolls"

interface ScrollPageProps {
  params: Promise<{ guildId: string; scrollId: string }>
}

export default async function ScrollPage({ params }: ScrollPageProps) {
  const { guildId, scrollId } = await params
  const guild = await getGuild(guildId)
  const user = await getUser()
  if (!guild) notFound()

  const scroll = await getScroll(scrollId)
  if (!scroll || scroll.guildId !== guildId) notFound()

  const isSeeder = user?.username === guild.seederUid
  const submissions = isSeeder ? await listSubmissions(scrollId) : []

  return (
    <div className="flex h-full flex-col p-6 lg:p-8">
      <ChamberHeader
        backHref={`/guild/${guildId}/scrolls`}
        icon={<FileText className="h-10 w-10 text-guild" />}
        title={scroll.title}
        subtitle={scroll.description || undefined}
      />
      <ScrollDetail
        scroll={scroll}
        submissions={submissions}
        isSeeder={isSeeder}
        currentUser={user?.username ?? ""}
      />
    </div>
  )
}
