import { notFound } from "next/navigation"
import { Target } from "lucide-react"

import { ChamberHeader } from "@/components/shared"
import { ProvisionQuestsButton } from "@/components/quests/ProvisionQuestsButton"
import { QuestBoard } from "@/components/quests/QuestBoard"
import { getUser } from "@/lib/auth"
import { getGuild } from "@/lib/guilds"
import { getBoardForGuild } from "@/lib/quests"

interface QuestsPageProps {
  params: Promise<{ guildId: string }>
}

export default async function QuestsPage({ params }: QuestsPageProps) {
  const { guildId } = await params
  const guild = await getGuild(guildId)
  const user = await getUser()

  if (!guild) notFound()

  const board = await getBoardForGuild(guildId)

  if (!board) {
    return (
      <div className="flex h-full flex-col overflow-hidden p-6 lg:p-8">
        <ChamberHeader
          backHref={`/guild/${guildId}`}
          icon={<Target className="h-10 w-10 text-guild" />}
          title="Quests"
          subtitle={`Endeavors of ${guild.name}`}
        />
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-dark/70 text-center">
          <div className="px-6 py-10">
            <p className="font-display text-lg tracking-[0.03em] text-gray">
              No quest board yet.
            </p>
            <p className="mt-2 max-w-md text-sm text-faint">
              Quests are optional per guild. The seeder can open a board.
            </p>
            <div className="mt-6">
              <ProvisionQuestsButton
                guildId={guildId}
                isSeeder={user?.username === guild.seederUid}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <QuestBoard
      guildId={guildId}
      guildName={guild.name}
      initialBoard={board}
    />
  )
}
