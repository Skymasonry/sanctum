import { Compass } from "lucide-react"

import { ChamberHeader } from "@/components/shared"
import { DiscoverSection } from "@/components/home/DiscoverSection"
import { getUser } from "@/lib/auth"
import { getAllGuildsUnfiltered } from "@/lib/guilds"

interface DiscoverPageProps {
  searchParams: Promise<{ q?: string }>
}

export const dynamic = "force-dynamic"

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const { q } = await searchParams
  const [user, guilds] = await Promise.all([getUser(), getAllGuildsUnfiltered()])

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray">Authenticating...</p>
      </div>
    )
  }

  const username = user.username.toLowerCase()
  const nonMemberGuilds = guilds.filter(
    g => !g.members.some(m => m.toLowerCase() === username),
  )

  return (
    <div className="flex h-full flex-col p-6 lg:p-8">
      <ChamberHeader
        backHref="/"
        icon={<Compass className="h-10 w-10 text-gold" />}
        title="Discover"
        subtitle="Guilds you haven't joined"
      />
      <div className="flex-1">
        <DiscoverSection
          guilds={nonMemberGuilds}
          username={username}
          search={q || ""}
        />
      </div>
    </div>
  )
}
