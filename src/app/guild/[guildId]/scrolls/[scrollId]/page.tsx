import { notFound } from "next/navigation"
import { FileText } from "lucide-react"

import { ChamberHeader, ChamberScroll } from "@/components/shared"
import { ScrollDetail } from "@/components/scrolls/ScrollDetail"
import { getUser } from "@/lib/auth"
import { getGuild } from "@/lib/guilds"
import { getScroll, listSubmissions } from "@/lib/scrolls"
import { canReviewSubmissions, isGuildManager } from "@/types/guild"

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

  const isSeeder = isGuildManager(guild, user?.username)
  const canReview = canReviewSubmissions(guild, user?.username)
  const submissions = canReview ? await listSubmissions(scrollId) : []

  return (
    <ChamberScroll>
      <ChamberHeader
        backHref={`/guild/${guildId}/scrolls`}
        icon={<FileText className="h-10 w-10 text-guild" />}
        title={scroll.title}
      />
      <ScrollDetail
        scroll={scroll}
        submissions={submissions}
        isSeeder={isSeeder}
        canReviewSubmissions={canReview}
        currentUser={user?.username ?? ""}
      />
    </ChamberScroll>
  )
}
