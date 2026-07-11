import { ChamberHeader } from "@/components/shared"
import { FocusCard, EntryGrid } from "@/components/threshold"
import { getGuild } from "@/lib/guilds"
import { getUser } from "@/lib/auth"
import { determineFocus } from "@/lib/focus"
import { getChamberNotifications } from "@/lib/notifications"
import { notFound } from "next/navigation"
import { GuildThresholdClient } from "./GuildThresholdClient"

interface ThresholdPageProps {
  params: Promise<{ guildId: string }>
}

function formatAdmission(admission: string): string {
  switch (admission) {
    case "open": return "Open"
    case "closed": return "Application Required"
    case "mandatory": return "All Members"
    default: return admission
  }
}

export default async function ThresholdPage({ params }: ThresholdPageProps) {
  const { guildId } = await params
  const guild = await getGuild(guildId)

  if (!guild) {
    notFound()
  }

  const user = await getUser()

  // Fetch focus and notifications in parallel
  const [focus, notifications] = await Promise.all([
    determineFocus(guild),
    getChamberNotifications(guild, user?.username || ""),
  ])

  // Build the href based on focus type
  const focusHref = focus.type === "rite"
    ? `/guild/${guildId}/rites`
    : focus.type === "quest"
    ? `/guild/${guildId}/quests`
    : focus.type === "scroll"
    ? `/guild/${guildId}/scrolls`
    : `/guild/${guildId}/pulse`

  const isSeeder = !!(user?.username && guild.seederUid &&
    user.username.toLowerCase() === guild.seederUid.toLowerCase())

  return (
    <GuildThresholdClient guild={guild} isSeeder={isSeeder}>
      <div className="flex h-full flex-col p-6 lg:p-8">
        <ChamberHeader
          icon={guild.icon?.startsWith("data:") ? <img src={guild.icon} alt="" className="h-9 w-9 object-contain" /> : guild.icon}
          title={guild.name}
          subtitle={guild.description}
          centered
          meta={
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-gray">
              <span>Seeded by <span className="text-guild">{guild.seederUid}</span></span>
              <span className="text-gray-dark">&middot;</span>
              <span>{guild.memberCount} members</span>
              <span className="text-gray-dark">&middot;</span>
              <span>{formatAdmission(guild.admission)}</span>
            </div>
          }
        />

        <div className="mx-auto w-full max-w-3xl flex-1">
          {/* Dynamic Focus Card */}
          <div className="mb-8">
            <FocusCard
              type={focus.type}
              title={focus.title}
              description={focus.description}
              href={focusHref}
              meta={focus.meta}
              avatars={focus.avatars}
              progress={focus.quest ? { current: focus.quest.progress, total: focus.quest.total } : undefined}
            />
          </div>

          {/* Entry Grid */}
          <EntryGrid guildId={guildId} guild={guild} notifications={notifications} />

        </div>
      </div>
    </GuildThresholdClient>
  )
}
