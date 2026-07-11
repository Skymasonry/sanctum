import { MessageCircle } from "lucide-react"
import { ChamberHeader } from "@/components/shared"
import { MessageList } from "@/components/pulse/MessageList"
import { ChatInput } from "@/components/pulse/ChatInput"
import { getGuild } from "@/lib/guilds"
import { getUser } from "@/lib/auth"
import { getMessages } from "@/lib/talk"
import { notFound } from "next/navigation"

interface PulsePageProps {
  params: Promise<{ guildId: string }>
}

export default async function PulsePage({ params }: PulsePageProps) {
  const { guildId } = await params
  const guild = await getGuild(guildId)

  if (!guild || !guild.resources.talkRoom) {
    notFound()
  }

  const user = await getUser()
  const token = guild.resources.talkRoom
  const messages = await getMessages(token, 50)

  return (
    <div className="flex h-full flex-col p-6 lg:p-8">
      <ChamberHeader
        backHref={`/guild/${guildId}`}
        icon={<MessageCircle className="h-10 w-10 text-guild" />}
        title="The Chat"
        subtitle={`Whispers of ${guild.name}`}
      />

      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-gray-dark bg-black">
        <MessageList messages={messages} currentUser={user?.username} />
        <ChatInput guildId={guildId} token={token} members={guild.members} />
      </div>
    </div>
  )
}
