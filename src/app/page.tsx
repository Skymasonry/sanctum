import { getUser } from "@/lib/auth"
import { getGuilds, getUserGuilds } from "@/lib/guilds"
import { getRooms } from "@/lib/talk"
import { Hearth } from "@/components/hearth/Hearth"
import type { Guild } from "@/types/guild"
import type { TalkRoom } from "@/lib/talk"

export interface PulseEntry {
  guildId: string
  guildName: string
  guildColor: string
  guildIcon: string
  token: string
  lastActivity: number
  unreadMessages: number
}

export interface GuildCalendarRef {
  guildId: string
  guildName: string
  guildColor: string
  guildIcon: string
  calendarUri: string
}

export default async function Home() {
  const user = await getUser()

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray">Authenticating...</p>
      </div>
    )
  }

  const [allGuilds, userGuilds, rooms] = await Promise.all([
    getGuilds(),
    getUserGuilds(),
    getRooms().catch(() => [] as TalkRoom[]),
  ])

  // Auto-join mandatory guilds the user isn't a member of yet
  const username = user.username?.toLowerCase() || ""
  for (const guild of allGuilds) {
    if (
      guild.admission === "mandatory" &&
      !guild.members.some((m: string) => m.toLowerCase() === username)
    ) {
      try {
        const { headers: h } = await import("next/headers")
        const headersList = await h()
        const authUser = headersList.get("x-authentik-username")
        const authGroups = headersList.get("x-authentik-groups")
        const authName = headersList.get("x-authentik-name")
        if (authUser) {
          const { postToNextcloud } = await import("@/lib/api")
          await postToNextcloud("/apps/skymasonsnav/api/orders/" + guild.id + "/join", {}, {
            headers: {
              "X-Authentik-Username": authUser,
              "X-Authentik-Groups": authGroups || "",
              "X-Authentik-Name": authName || "",
            },
          })
        }
      } catch {
        // Ignore join failures
      }
    }
  }

  // Map talk room tokens to guilds
  const tokenToGuild = new Map<string, Guild>()
  for (const guild of userGuilds) {
    if (guild.resources.talkRoom) {
      tokenToGuild.set(guild.resources.talkRoom, guild)
    }
  }

  // Pulse entries ordered by most recent activity
  const pulseEntries: PulseEntry[] = rooms
    .filter((r) => tokenToGuild.has(r.token))
    .map((r) => {
      const guild = tokenToGuild.get(r.token)!
      return {
        guildId: guild.id,
        guildName: guild.name,
        guildColor: guild.color,
        guildIcon: guild.icon,
        token: r.token,
        lastActivity: r.lastActivity,
        unreadMessages: r.unreadMessages,
      }
    })
    .sort((a, b) => b.lastActivity - a.lastActivity)

  // Calendar refs for client-side event fetching
  const guildCalendars: GuildCalendarRef[] = userGuilds
    .filter((g) => g.resources.calendarUri)
    .map((g) => ({
      guildId: g.id,
      guildName: g.name,
      guildColor: g.color,
      guildIcon: g.icon,
      calendarUri: g.resources.calendarUri!,
    }))

  return (
    <Hearth
      user={user}
      allGuilds={allGuilds}
      userGuilds={userGuilds}
      pulseEntries={pulseEntries}
      guildCalendars={guildCalendars}
    />
  )
}
