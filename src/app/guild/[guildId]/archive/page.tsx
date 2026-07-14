import { Archive } from "lucide-react"
import { notFound } from "next/navigation"

import { ChamberHeader, UnprovisionedChamber } from "@/components/shared"
import { ArchiveBrowser } from "@/components/archive/ArchiveBrowser"
import { getUser } from "@/lib/auth"
import { getGuild } from "@/lib/guilds"

interface ArchivePageProps {
  params: Promise<{ guildId: string }>
}

export default async function ArchivePage({ params }: ArchivePageProps) {
  const { guildId } = await params
  const guild = await getGuild(guildId)
  const user = await getUser()

  if (!guild) {
    notFound()
  }

  if (!guild.resources.folderId) {
    return (
      <div className="flex h-full flex-col p-6 lg:p-8">
        <ChamberHeader
          backHref={`/guild/${guildId}`}
          icon={<Archive className="h-10 w-10 text-guild" />}
          title="Archive"
          subtitle={`Records of ${guild.name}`}
        />
        <UnprovisionedChamber
          guildId={guildId}
          spaceType="folder"
          chamberLabel="archive"
          bodyLine="Archive is optional per guild. The seeder can open one now."
          isSeeder={user?.username === guild.seederUid}
        />
      </div>
    )
  }

  return (
    <ArchiveBrowser
      guildId={guildId}
      guildName={guild.name}
      folderId={guild.resources.folderId}
    />
  )
}
