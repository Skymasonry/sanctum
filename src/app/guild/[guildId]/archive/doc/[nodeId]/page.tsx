import { FileText } from "lucide-react"
import { notFound } from "next/navigation"

import { ChamberHeader } from "@/components/shared"
import { DocEditor } from "@/components/docs/DocEditor"
import { getUser } from "@/lib/auth"
import { getNode } from "@/lib/files"
import { isDocNode } from "@/lib/files-shared"
import { getGuild } from "@/lib/guilds"

interface DocPageProps {
  params: Promise<{ guildId: string; nodeId: string }>
}

export default async function DocPage({ params }: DocPageProps) {
  const { guildId, nodeId } = await params
  const [guild, node, user] = await Promise.all([
    getGuild(guildId),
    getNode(nodeId),
    getUser(),
  ])

  if (!guild || !node || node.guildId !== guildId) notFound()
  if (!isDocNode(node)) notFound()

  return (
    <div className="flex h-full flex-col p-6 lg:p-8">
      <ChamberHeader
        backHref={`/guild/${guildId}/archive`}
        icon={<FileText className="h-10 w-10 text-guild" />}
        title={node.name}
        subtitle={`Live document in ${guild.name}`}
      />
      <DocEditor nodeId={nodeId} userLabel={user?.name || user?.username || "Anon"} />
    </div>
  )
}
