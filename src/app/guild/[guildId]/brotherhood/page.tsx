import { Users, UserPlus } from "lucide-react"
import { ChamberHeader, Card, CardTitle } from "@/components/shared"
import { getGuild } from "@/lib/guilds"
import { getUser } from "@/lib/auth"
import { isGuildManager } from "@/types/guild"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ApplicationsPanel } from "./applications-panel"

interface BrotherhoodPageProps {
  params: Promise<{ guildId: string }>
}

function MemberCard({ username, isSeeder, isSteward }: { username: string; isSeeder: boolean; isSteward: boolean }) {
  return (
    <Link
      href={`/profile/${encodeURIComponent(username)}`}
      className="block transition-transform hover:-translate-y-0.5"
    >
      <Card>
        <div className="flex items-center gap-4">
          <img
            src={`/api/avatar/${username}/48`}
            alt={username}
            className="h-12 w-12 flex-shrink-0 rounded-full"
          />
          <div className="min-w-0 flex-1">
            <CardTitle className={isSeeder ? "text-gold group-hover:text-gold" : undefined}>
              {username}
            </CardTitle>
            {(isSeeder || isSteward) && (
              <p className="text-sm text-gold/70">
                {[isSeeder && "Seeder", isSteward && "Steward"].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}

export default async function BrotherhoodPage({ params }: BrotherhoodPageProps) {
  const { guildId } = await params
  const [guild, user] = await Promise.all([getGuild(guildId), getUser()])

  if (!guild) {
    notFound()
  }

  const canManage = isGuildManager(guild, user?.username)
  const applications = guild.applications ?? []

  const sortedMembers = [...guild.members].sort((a, b) => {
    if (a === guild.seederUid) return -1
    if (b === guild.seederUid) return 1
    return a.localeCompare(b)
  })

  return (
    <div className="flex h-full flex-col overflow-hidden p-6 lg:p-8">
      <ChamberHeader
        backHref={`/guild/${guildId}`}
        icon={<Users className="h-10 w-10 text-guild" />}
        title="Brothers"
        subtitle={`${guild.memberCount} members of ${guild.name}`}
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition-colors hover:bg-guild/80"
        >
          <UserPlus className="h-4 w-4" />
          Invite Someone
        </Link>
      </div>

      <div className="scrollbar-none flex-1 overflow-y-auto">
        {canManage && applications.length > 0 && (
          <ApplicationsPanel guildId={guildId} applications={applications} />
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedMembers.map((username) => (
            <MemberCard
              key={username}
              username={username}
              isSeeder={username === guild.seederUid}
              isSteward={guild.stewardUids.some(s => s.toLowerCase() === username.toLowerCase())}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
