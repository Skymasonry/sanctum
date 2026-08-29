import { MessageCircle } from "lucide-react"
import { ChamberHeader, UnprovisionedChamber } from "@/components/shared"
import { MessageList } from "@/components/pulse/MessageList"
import { ChatInput } from "@/components/pulse/ChatInput"
import { getGuild } from "@/lib/guilds"
import { getUser } from "@/lib/auth"
import { getMessages } from "@/lib/talk"
import { isGuildManager } from "@/types/guild"
import { notFound } from "next/navigation"

interface PulsePageProps {
  params: Promise<{ guildId: string }>
}

export default async function PulsePage({ params }: PulsePageProps) {
  const { guildId } = await params
  const guild = await getGuild(guildId)
  const user = await getUser()

  if (!guild) {
    notFound()
  }

  if (!guild.resources.talkRoom) {
    return (
      <div className="flex h-full flex-col overflow-hidden p-6 lg:p-8">
        <ChamberHeader
          backHref={`/guild/${guildId}`}
          icon={<MessageCircle className="h-10 w-10 text-guild" />}
          title="The Chat"
          subtitle={`Whispers of ${guild.name}`}
        />
        <UnprovisionedChamber
          guildId={guildId}
          spaceType="chat"
          chamberLabel="chat room"
          bodyLine="Chat is optional per guild. The seeder can open one now."
          isSeeder={isGuildManager(guild, user?.username)}
        />
      </div>
    )
  }

  const token = guild.resources.talkRoom
  const messages = await getMessages(token, 50)

  return (
    <div className="flex h-full flex-col overflow-hidden p-6 lg:p-8">
      <ChamberHeader
        backHref={`/guild/${guildId}`}
        icon={<MessageCircle className="h-10 w-10 text-guild" />}
        title="The Chat"
        subtitle={`Whispers of ${guild.name}`}
      />

      <div className="glass-light flex min-h-0 flex-1 flex-col rounded-[var(--card-radius)]">
        <MessageList messages={messages} currentUser={user?.username} token={token} />
        <ChatInput guildId={guildId} token={token} members={guild.members} />
      </div>
    </div>
  )
}
