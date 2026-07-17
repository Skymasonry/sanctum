import { getUser } from "@/lib/auth"
import { HomePage } from "@/components/home/HomePage"
import { getAllGuildsUnfiltered, getUserGuilds } from "@/lib/guilds"

export const dynamic = "force-dynamic"

export default async function Home() {
  const user = await getUser()

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray">Authenticating...</p>
      </div>
    )
  }

  const [allGuilds, userGuilds] = await Promise.all([
    getAllGuildsUnfiltered(),
    getUserGuilds(),
  ])

  // Calendar sources for the HomePage's upcoming-events fetcher.
  const guildCalendars = userGuilds
    .filter(g => !!g.resources.calendarUri)
    .map(g => ({
      guildId: g.id,
      guildName: g.name,
      guildColor: g.color,
      guildIcon: g.icon,
      calendarUri: g.resources.calendarUri as string,
    }))

  return (
    <HomePage
      user={user}
      allGuilds={allGuilds}
      userGuilds={userGuilds}
      guildCalendars={guildCalendars}
    />
  )
}
